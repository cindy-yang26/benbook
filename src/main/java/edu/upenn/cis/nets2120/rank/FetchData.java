package edu.upenn.cis.nets2120.rank;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;

import java.util.List;

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

import edu.upenn.cis.nets2120.config.Config;
import edu.upenn.cis.nets2120.storage.DynamoConnector;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;

public class FetchData {

	/**
	 * Connection to DynamoDB
	 */
	DynamoDB db;
	
	Table users;
	Table articles;
	Table categories;
	Table friends;
	Table likes;
	
	BufferedWriter graph_a;
	BufferedWriter graph_c;
	BufferedWriter graph_ua;
	BufferedWriter graph_uc;
	BufferedWriter graph_uu;
	BufferedWriter graph_users;
	BufferedWriter graph_tilde;
	
	public FetchData() {

	}
	
	/**
	 * Initialize the database connection and open the file
	 * 
	 * @throws IOException
	 * @throws InterruptedException 
	 * @throws DynamoDbException 
	 */
	public void initialize() throws IOException, DynamoDbException, InterruptedException {
		db = DynamoConnector.getConnection(Config.DYNAMODB_URL);

		users = db.getTable("users");
		articles = db.getTable("articles");
		categories = db.getTable("categories");
		friends = db.getTable("friends");
		likes = db.getTable("likes");
		
		graph_a = new BufferedWriter(new FileWriter(Config.GRAPH_A_FILE));
		graph_c = new BufferedWriter(new FileWriter(Config.GRAPH_C_FILE));
		graph_ua = new BufferedWriter(new FileWriter(Config.GRAPH_UA_FILE));
		graph_uc = new BufferedWriter(new FileWriter(Config.GRAPH_UC_FILE));
		graph_uu = new BufferedWriter(new FileWriter(Config.GRAPH_UU_FILE));
		graph_users = new BufferedWriter(new FileWriter(Config.GRAPH_USERS_FILE));
		graph_tilde = new BufferedWriter(new FileWriter(Config.GRAPH_TILDE_FILE));
	}

	public void run() throws IOException {
		// write article-category edges
		for (Item a: articles.scan()) {
			graph_a.write((String)a.get("date") + "-" + a.get("aid") + "_a," + (String)a.get("category") + "_c");
			graph_a.newLine();
			graph_c.write((String)a.get("category") + "_c," + (String)a.get("date") + "-" + a.get("aid") + "_a");
			graph_c.newLine();
		}
		// user-self edges (for injection) and user-category edges
		for (Item u: users.scan()) {
			graph_users.write((String)u.get("username") + "_t," + (String)u.get("username") + "_u");
			graph_users.newLine();
			graph_tilde.write((String)u.get("username") + "_t," + (String)u.get("username") + "_t");
			graph_tilde.newLine();
			if (u.get("interests") != null) {
				for (String c : (List<String>) u.get("interests")) {
					graph_c.write(c + "_c," + (String)u.get("username") + "_u");
					graph_c.newLine();
					graph_uc.write((String)u.get("username") + "_u," + c + "_c");
					graph_uc.newLine();
				}
			}
		}
		// user-article edges
		for (Item l: likes.scan()) {
			String a = (String)l.get("article");
			String u = (String)l.get("username");
			graph_a.write(a + "_a," + u + "_u");
			graph_a.newLine();
			graph_ua.write(u + "_u" + "," + a + "_a");
			graph_ua.newLine();
		}
		// write user-user edges
		for (Item u: friends.scan()) {
			if (u.get("friends") != null) {
				for (String f : (List<String>) u.get("friends")) {
					graph_uu.write((String)u.get("username") + "_u," + f + "_u");
					graph_uu.newLine();
				}
			}
		}
	}
	
	/**
	 * Graceful shutdown
	 */
	public void shutdown() {
		try {
			graph_a.close();
			graph_c.close();
			graph_ua.close();
			graph_uc.close();
			graph_uu.close();
			graph_users.close();
			graph_tilde.close();
		} catch (final IOException e) {
			e.printStackTrace();
		}
		DynamoConnector.shutdown();
	}
	
}
