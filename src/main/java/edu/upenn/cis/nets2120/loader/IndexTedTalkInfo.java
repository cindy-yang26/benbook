package edu.upenn.cis.nets2120.loader;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.TableWriteItems;
import com.amazonaws.services.dynamodbv2.model.AttributeDefinition;
import com.amazonaws.services.dynamodbv2.model.KeySchemaElement;
import com.amazonaws.services.dynamodbv2.model.KeyType;
import com.amazonaws.services.dynamodbv2.model.ProvisionedThroughput;
import com.amazonaws.services.dynamodbv2.model.ResourceInUseException;
import com.amazonaws.services.dynamodbv2.model.ScalarAttributeType;
import com.amazonaws.services.dynamodbv2.model.WriteRequest;

import edu.upenn.cis.nets2120.loader.TedTalkParser.TalkDescriptionHandler;
import opennlp.tools.stemmer.PorterStemmer;
import opennlp.tools.stemmer.Stemmer;
import opennlp.tools.tokenize.SimpleTokenizer;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;

// class to write article data to db
public class IndexTedTalkInfo implements TalkDescriptionHandler {
	static Logger logger = LogManager.getLogger(TalkDescriptionHandler.class);
	
	int row = 0;
	
	final int batchSize = 25;
	
	public final static List<String> TOKENIZE_COLS = Arrays.asList(
		"category", 
		"headline", 
		"authors", 
		"short_description"
	);
	
	SimpleTokenizer model;
	Stemmer stemmer;
	DynamoDB db;
	Table iindex;
	Table articles;
	Table categories;
	
	public IndexTedTalkInfo(final DynamoDB db) throws DynamoDbException, InterruptedException {
		model = SimpleTokenizer.INSTANCE;
		stemmer = new PorterStemmer();
		this.db = db;

		initializeTables();
	}

	/**
	 * Called every time a line is read from the input file. Breaks into keywords
	 * and indexes them.
	 * 
	 * @param csvRow      Row from the CSV file
	 * @param columnNames Parallel array with the names of the table's columns
	 */
	@Override
	public void accept(final String[] csvRow, final String[] columnNames) {
		Set<Item> cache = new HashSet<>();
		// index of aid and url in csvRow
		int aid = Integer.parseInt(lookup(csvRow, columnNames, "aid"));
		Set<String> stopWords = getStopWords();
		
		Item article = new Item().withPrimaryKey(
			"date", lookup(csvRow, columnNames, "date"),
			"aid", (int)(aid)
		);
		System.out.println(aid);
		for (int i = 0; i < csvRow.length; i++) {
			if (columnNames[i] != "date" && columnNames[i] != "aid")
				article = article.withString(columnNames[i], csvRow[i]);
		}
		System.out.println(articles.putItem(article));
		Item category = new Item().withPrimaryKey("category", csvRow[1]);
		categories.putItem(category);
		
		// stream of indices in range
		IntStream.range(0, csvRow.length) 
			// filter into cols we want to reverse index, then map into streams
			.filter(i -> TOKENIZE_COLS.contains(columnNames[i]))
			.mapToObj(i -> Arrays.stream(model.tokenize(csvRow[i])))
			// flatten stream (combine into one big stream)
			.flatMap(s -> s)
			// map our words into lowercase BEFORE filtering
			.map(String::toLowerCase)
			// drop any non-words or stop words
			.filter(
				w -> w.matches("[a-z]+") &&
				!stopWords.contains(w))
			// stem our words
			.map(w -> stemmer.stem(w))
			// remove any duplicate words
			.distinct()
			// add item into batch for each word
			// write batch every batchSize
			.forEach(w -> { 
				cache.add(new Item()
					.withPrimaryKey("keyword", w, "date", lookup(csvRow, columnNames, "date"))
					.withNumber("aid", aid)
				);
				System.out.println(w);
				System.out.println(aid);
				if (cache.size() == batchSize) { writeBatch(cache); }
			});
		// write any leftover items
		if (cache.size() != 0) { writeBatch(cache); }
	}
	
	/**
	 * Returns set of stop words from hlp_en_stop_words.txt
	 * On any IO error returns empty set
	 */
	public static Set<String> getStopWords() {
		try { 
			return Files.lines(Paths.get("src/main/resources/nlp_en_stop_words.txt"))
				.collect(Collectors.toCollection(HashSet::new));
		} catch (IOException e) {
			System.out.println("No stop words");
			return new HashSet<>();
		}
	}
	
	/**
	 * Sends and clears cache of items. If any items are left unprocessed method
	 * continually tries again until all items are processed.
	 * 
	 * @param cache       Batch of 25 or less items to write to our database
	 */
	private void writeBatch(Collection<Item> cache) {
		System.out.println("Write");
		Map<String, List<WriteRequest>> unproc = 
			db.batchWriteItem(new TableWriteItems("inverted").withItemsToPut(cache))
			.getUnprocessedItems();
		System.out.println(db.batchWriteItem(new TableWriteItems("inverted").withItemsToPut(cache)));
		while (!unproc.isEmpty()) {
			unproc = db.batchWriteItemUnprocessed(unproc).getUnprocessedItems();
		}
		cache.clear();
	}
	
	private void initializeTables() throws DynamoDbException, InterruptedException {
		iindex = db.getTable("inverted");
		articles = db.getTable("articles");
		categories = db.getTable("categories");
	}

	/**
	 * Given the CSV row and the column names, return the column with a specified
	 * name
	 * 
	 * @param csvRow
	 * @param columnNames
	 * @param columnName
	 * @return
	 */
	public static String lookup(final String[] csvRow, final String[] columnNames, final String columnName) {
		final int inx = Arrays.asList(columnNames).indexOf(columnName);
		
		if (inx < 0)
			throw new RuntimeException("Out of bounds");
		
		return csvRow[inx];
	}
}
