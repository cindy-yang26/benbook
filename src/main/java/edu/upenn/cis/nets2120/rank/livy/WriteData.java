package edu.upenn.cis.nets2120.rank.livy;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;
import java.util.Map;
import java.util.HashSet;
import java.util.HashMap;
import java.util.Map.Entry;
import java.util.Collection;

import org.apache.livy.JobHandle;
import org.apache.livy.LivyClient;
import org.apache.livy.LivyClientBuilder;

import com.amazonaws.services.dynamodbv2.document.spec.QuerySpec;
import com.amazonaws.services.dynamodbv2.document.QueryOutcome;
import com.amazonaws.services.dynamodbv2.document.utils.ValueMap;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.ItemCollection;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.TableWriteItems;
import com.amazonaws.services.dynamodbv2.document.PrimaryKey;
import com.amazonaws.services.dynamodbv2.model.AttributeDefinition;
import com.amazonaws.services.dynamodbv2.model.KeySchemaElement;
import com.amazonaws.services.dynamodbv2.model.KeyType;
import com.amazonaws.services.dynamodbv2.model.ProvisionedThroughput;
import com.amazonaws.services.dynamodbv2.model.ResourceInUseException;
import com.amazonaws.services.dynamodbv2.model.ScalarAttributeType;
import com.amazonaws.services.dynamodbv2.model.WriteRequest;

import edu.upenn.cis.nets2120.config.Config;
import edu.upenn.cis.nets2120.storage.DynamoConnector;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;

import com.google.common.collect.Sets;

import edu.upenn.cis.nets2120.config.Config;

public class WriteData {
	
	DynamoDB db;
	
	public WriteData() {

	}
	
	public void run(List<MyPair<MyPair<String, String>, Double>> feed) {
		
		// sort feed by user
		HashSet<String> seenUsers = new HashSet<>();
		HashMap<String, HashSet<MyPair<MyPair<String, String>, Double>>> feedByUser = new HashMap<>();
		for (MyPair<MyPair<String, String>, Double> entry : feed) {
			if (!feedByUser.containsKey(entry.getLeft().getLeft())) {
				feedByUser.put(entry.getLeft().getLeft(), new HashSet<>());
			}
			feedByUser.get(entry.getLeft().getLeft()).add(entry);	
		}
		
		db = DynamoConnector.getConnection(Config.DYNAMODB_URL);
		Set<Item> cache = new HashSet<>();
		int batchSize = 25;
		Table feedTable = db.getTable("feeds");
		
		// for each user, delete all their ranks, then write the new ranks
		for (Entry<String, HashSet<MyPair<MyPair<String, String>, Double>>> bigEntry : feedByUser.entrySet()) {
			String user = bigEntry.getKey();
			// deleting old ranks
			QuerySpec spec = new QuerySpec()
				.withKeyConditionExpression("username = :u")
				.withValueMap(new ValueMap().withString(":u", user));
			try {
				ItemCollection<QueryOutcome> items = feedTable.query(spec);
				for (Item i : items) {
					feedTable.deleteItem(
						new PrimaryKey()
							.addComponent("username", (String)i.asMap().get("username"))
							.addComponent("article", (String)i.asMap().get("article"))
					);
					System.out.println("deleted " + (String)i.asMap().get("username") + " " + (String)i.asMap().get("article"));
				}
			} catch (Exception e) {
				e.printStackTrace();
				// user has no feed. that's ok!
			}
			// writing new ranks
			for (MyPair<MyPair<String, String>, Double> entry : bigEntry.getValue()) {
				System.out.println(entry.getLeft().getLeft() + " suggestion weight " + entry.getRight() + " article " + entry.getLeft().getRight());
				if (!seenUsers.contains(entry.getLeft().getLeft())) {
					seenUsers.add(entry.getLeft().getLeft());
					
				}
				// write feed entry
				cache.add(new Item()
					.withPrimaryKey("username", entry.getLeft().getLeft(), "article", entry.getLeft().getRight())
					.withNumber("weight", entry.getRight())
				);
				if (cache.size() == batchSize) { writeBatch(cache); }
			}
		}
		// write any leftover items from cache
		if (cache.size() != 0) { writeBatch(cache); }

	}

	/**
	 * Sends and clears cache of items. If any items are left unprocessed method
	 * continually tries again until all items are processed.
	 * 
	 * @param cache       Batch of 25 or less items to write to our database
	 */
	private void writeBatch(Collection<Item> cache) {
		Map<String, List<WriteRequest>> unproc = 
			db.batchWriteItem(new TableWriteItems("feeds").withItemsToPut(cache))
				.getUnprocessedItems();
		while (!unproc.isEmpty()) {
			unproc = db.batchWriteItemUnprocessed(unproc).getUnprocessedItems();
		}
		cache.clear();
	}

}
