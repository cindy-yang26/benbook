package edu.upenn.cis.nets2120.rank.livy;

import java.io.IOException;

import org.apache.livy.Job;
import org.apache.livy.JobContext;
import org.apache.spark.api.java.JavaPairRDD;
import org.apache.spark.api.java.JavaRDD;
import org.apache.spark.api.java.JavaSparkContext;
import org.apache.spark.sql.SparkSession;

import edu.upenn.cis.nets2120.config.Config;
import edu.upenn.cis.nets2120.rank.livy.MyPair;
import edu.upenn.cis.nets2120.storage.SparkConnector;
import edu.upenn.cis.nets2120.rank.FetchData;
import scala.Tuple2;
import java.text.SimpleDateFormat;
import java.util.Date;

import org.apache.livy.Job;
import org.apache.livy.JobContext;

import java.util.Map;
import java.util.HashSet;
import java.util.Set;
import java.util.Collection;
import java.util.List;
import java.util.ArrayList;

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

public class NewsRankJob implements Job<List<MyPair<MyPair<String, String>, Double>>> {

	private static final long serialVersionUID = 1L;

	/**
	 * Connection to Apache Spark
	 */
	SparkSession spark;
	
	JavaSparkContext context;
	
	DynamoDB db;
	
	public NewsRankJob() {
		System.setProperty("file.encoding", "UTF-8");
	}

	/**
	 * Initialize the database connection and open the file
	 * 
	 * @throws IOException
	 * @throws InterruptedException 
	 */
	public void initialize() throws IOException, InterruptedException {

		spark = SparkConnector.getSparkConnection();
		context = SparkConnector.getSparkContext();
		
	}
	
	/**
	 * Graph builder
	 * 
	 * @param filePath
	 * @return JavaPairRDD: (from, to)
	 */
	JavaPairRDD<String, String> getGraph(String filePath) {
		return context
			// load graph file into spark
			.textFile(filePath, Config.PARTITIONS)
			// split on spaces
			.map(line -> line.toString().split(","))
			// (from, to)
			.mapToPair(arr -> new Tuple2<>(arr[0], arr[1]))
			.distinct();
	}
	
	// (from, (to, wt/outdeg))
	JavaPairRDD<String, Tuple2<String, Double>> getEdgeTransfer(JavaPairRDD<String, String> graph, double weight) {
		return graph.join(
			graph
			// (from, 1) x outdeg
			.mapToPair(x -> new Tuple2<String, Double>(x._1, 1.0))
			// (from, outdeg)
			.reduceByKey((x, y) -> x + y)
			// (from, wt/outdeg)
			.mapToPair(x -> new Tuple2<String, Double>(x._1, weight / x._2))
		);
	}

	/**
	 * Main functionality in the program: read and process the files
	 * 
	 * @throws IOException File read, network, and other errors
	 * @throws InterruptedException User presses Ctrl-C
	 */
	public List<MyPair<MyPair<String, String>, Double>> run(int imax, double dmax, boolean debug) throws IOException, InterruptedException {
		
		// changed for injections...
		// (from, (to, wt))
		JavaPairRDD<String, Tuple2<String, Double>> edgeTransfer = 
			getEdgeTransfer(getGraph(Config.GRAPH_USERS_S3), 0.3)
			.union(
				getEdgeTransfer(getGraph(Config.GRAPH_A_S3), 1.0)
			)
			.union(
				getEdgeTransfer(getGraph(Config.GRAPH_C_S3), 1.0)
			)
			.union(
				getEdgeTransfer(getGraph(Config.GRAPH_UA_S3), 0.3)
			)
			.union(
				getEdgeTransfer(getGraph(Config.GRAPH_UC_S3), 0.2)
			)
			.union(
				getEdgeTransfer(getGraph(Config.GRAPH_UU_S3), 0.2)
			)
			.union(
				getEdgeTransfer(getGraph(Config.GRAPH_TILDE_S3), 1.0)
			);

		System.out.println(
			"This graph contains " + 
			edgeTransfer
				.keys()
				.distinct()
				.count() +
			" nodes and " + 
			edgeTransfer
				.count() + 
			" edges"
		);
		
		// (user, (user, 1))
		JavaPairRDD<String, Tuple2<String, Double>> ranks = 
			// (user, user)
			getGraph(Config.GRAPH_USERS_S3)
			// (user, (user, 1))
			.mapToPair(x -> new Tuple2<String, Tuple2<String, Double>>(x._1, new Tuple2<String, Double>(x._2, 1.0)));
		
		double decay = 0.15;
		double dcurr = Double.MAX_VALUE;
		for (int i = 1; i <= imax && dcurr >= dmax; ++i) {
			JavaPairRDD<String, Tuple2<String, Double>> newRanks = edgeTransfer
				// (from, ((to, wt), (user, from's rank))
				.join(ranks)
				// ((to, user), wt * from's rank))
				.mapToPair(x -> new Tuple2<Tuple2<String, String>, Double>(
					new Tuple2<String, String> (x._2._1._1, x._2._2._1),
					x._2._2._2 * x._2._1._2)
				)
				// ((to, user), total user rank)
				.reduceByKey((a, b) -> a + b)
				// (to, (user, rank))
				.mapToPair(x -> new Tuple2<String, Tuple2<String, Double>>(
					x._1._1,
					new Tuple2<String, Double> (x._1._2, x._2))
				);
			
			JavaPairRDD<String, Double> totalRanks = newRanks
				// (to, rank) x user
				.mapToPair(x -> new Tuple2<String, Double>(x._1, x._2._2))
				// (to, total rank)
				.reduceByKey((a, b) -> a + b);
			
			newRanks = newRanks
				// (to, ((user, rank), total rank))
				.join(totalRanks)
				// (to, (user, normalized rank))
				.mapToPair(x -> new Tuple2<String, Tuple2<String, Double>>(
					x._1,
					new Tuple2<String, Double> (x._2._1._1, x._2._1._2 / x._2._2))
				)
				// drop if rank is less than 0 percent of the convergence threshold
				.filter(x -> x._2._2 >= 0 * dmax);
			
			// collect new ranks and print if in debug mode
			if (true) {
				System.out.println("round " + i);
				newRanks
					.collect()
					.stream()
					.forEach(
						x -> System.out.println(x._1 + " " + x._2._1 + " " + x._2._2)	
					);
				System.out.println("round " + i);
			}
			
			// updating round current max distance
			dcurr = newRanks
				// (node, ((user, new rank), (user, old rank)))
				.join(ranks)
				// ((user, new rank), (user, old rank))
				.values()
				// abs rank diff
				.map(x -> Math.abs(x._1._2 - x._2._2))
				// max abs rank diff
				.reduce((a, b) -> Math.max(a, b));
			
			// dont quit if still discovering nodes
			if (newRanks.keys().distinct().count() != ranks.keys().distinct().count())
				dcurr = Double.MAX_VALUE;
			
			// update all ranks
			ranks = newRanks;
		}
		
		// today's date
		String date = new SimpleDateFormat("yyyy-MM-dd").format(new Date());
		
		List<MyPair<MyPair<String, String>, Double>> feed = ranks
			// only keep articles
			.filter(x -> x._1.charAt(x._1.length() - 1) == 'a')
			// DO NOT FILTER ARTICLES BY DATE!
			//.filter(x -> x._1.substring(0, 10).equals(date))
			// ((user, article), rank) 
			.mapToPair(x -> new Tuple2<Tuple2<String, String>, Double>(
				new Tuple2<String, String>(x._2._1, x._1), x._2._2
			))
			// drop rank < 0.01 -- basically 0 rank
			.filter(x -> x._2 >= 0.01)
			// delete viewed articles
			.subtractByKey(
				// (user, article) viewed
				getGraph(Config.GRAPH_UA_S3)
					.mapToPair(x -> new Tuple2<Tuple2<String, String>, Double>(x, 0.0))
			)
			// drop _a and _u suffixes
			.mapToPair(x -> new Tuple2<Tuple2<String, String>, Double>(
				new Tuple2<String, String>(
					x._1._1.substring(0, x._1._1.length() - 2), 
					x._1._2.substring(0, x._1._2.length() - 2)
				),
				x._2
			))
			// turn into MyPairs for serialization
			.map(x -> new MyPair<MyPair<String, String>, Double>(
				new MyPair<String, String>(x._1._1, x._1._2),
				x._2
			))
			// ((user, article), rank) list
			.collect();
		
		// do this for serialization
		List<MyPair<MyPair<String, String>, Double>> ret = new ArrayList();
		for (MyPair<MyPair<String, String>, Double> mp : feed)
			ret.add(mp);
		
		return ret;
	
	}

	@Override
	public List<MyPair<MyPair<String, String>, Double>> call(JobContext arg0) throws Exception {
		initialize();
		int imax = 15; // max number iters
		double dmax = 0.02; // convergence threshold
		boolean debug = false;
		return run(imax, dmax, debug);
	}

}
