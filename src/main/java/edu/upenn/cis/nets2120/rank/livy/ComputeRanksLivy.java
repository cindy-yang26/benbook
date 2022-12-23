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
import java.util.Collection;

import org.apache.livy.JobHandle;
import org.apache.livy.LivyClient;
import org.apache.livy.LivyClientBuilder;

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

import com.google.common.collect.Sets;

import edu.upenn.cis.nets2120.config.Config;
import edu.upenn.cis.nets2120.rank.FetchData;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import java.text.SimpleDateFormat;
import java.util.Date;

// driver for computing ranks via livy job
public class ComputeRanksLivy {
	
	static DynamoDB db;
	
	public static void main(String[] args) throws IOException, URISyntaxException, InterruptedException, ExecutionException {
		
		// get data
		FetchData fetch = new FetchData();
		try {
			fetch.initialize();
			fetch.run();
			fetch.shutdown();
		} catch (final IOException e) {
			e.printStackTrace();
		}
		
		String date = new SimpleDateFormat("yyyy-MM-dd").format(new Date());
		System.out.println("Date is " + date);
		
        // write files to s3
        writeFile(Config.GRAPH_USERS_FILE, "graph_users.txt");
        writeFile(Config.GRAPH_TILDE_FILE, "graph_tilde.txt");
        writeFile(Config.GRAPH_A_FILE, "graph_a.txt");
        writeFile(Config.GRAPH_C_FILE, "graph_c.txt");
        writeFile(Config.GRAPH_UA_FILE, "graph_ua.txt");
        writeFile(Config.GRAPH_UC_FILE, "graph_uc.txt");
        writeFile(Config.GRAPH_UU_FILE, "graph_uu.txt");
        
		
		// open connection to Livy
		LivyClient client = new LivyClientBuilder()
		  // uri to cluster
		  .setURI(new URI("http://ec2-3-237-233-128.compute-1.amazonaws.com:8998"))
		  .build();

		try {
		  // path to jar containing SocialRankJob
		  String jar = "target/nets2120-project-0.0.1-SNAPSHOT.jar";
		
		  // upload jar to livy
		  System.out.printf("Uploading %s to the Spark context...\n", jar);
		  client.uploadJar(new File(jar)).get();
		
		  System.out.println(client.submit(new NewsRankJob()));
		  System.out.println("Running NewsRankJob");
		  // ((user, article), rank) list
		  	List<MyPair<MyPair<String, String>, Double>> feed = client
		  		.submit(new NewsRankJob())
		  		.get();
		  
		  	System.out.println(feed.size());
		  // write all the results back to dynamodb
		  (new WriteData()).run(feed);
		  
		} catch(Exception e) {
			e.printStackTrace();
		} finally {
		  client.stop(true);
		}
	}
	
	public static void writeFile(String filePath, String fileName) {
		
        S3Client s3client = S3Client
        	.builder()
        	.region(Region.US_EAST_1)
        	.build();
         
        PutObjectRequest request = PutObjectRequest
        	.builder()
            .bucket(Config.BUCKET_NAME)
            .key(fileName)
            .build();
        
        s3client.putObject(request, RequestBody.fromFile(new File(filePath)));
	}
}
