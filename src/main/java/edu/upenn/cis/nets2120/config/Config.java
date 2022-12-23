package edu.upenn.cis.nets2120.config;

/**
 * Global configuration for java code in benbook project
 * 
 * A better version of this would read a config file from the resources,
 * such as a YAML file.  But our first version is designed to be simple
 * and minimal. 
 * 
 * @author zives
 *
 */
public class Config {

	/**
	 * If we set up a local DynamoDB server, where does it listen?
	 */
	public static int DYNAMODB_LOCAL_PORT = 8000;

	/**
	 * This is the connection to the DynamoDB server. For MS1, please
	 * keep this as http://localhost:8000; for MS2; you should replace it
	 * with https://dynamodb.us-east-1.amazonaws.com. 
	 */
	public static String DYNAMODB_URL = "https://dynamodb.us-east-1.amazonaws.com";
	//		"http://localhost:8000";
	//		"https://dynamodb.us-east-1.amazonaws.com";
	
	/**
	 * Do we want to use the local DynamoDB instance or a remote one?
	 * 
	 * If we are local, performance is really slow - so you should switch
	 * to the real thing as soon as basic functionality is in place.
	 */
	public static Boolean LOCAL_DB = false;
	
	public static String LOCAL_SPARK = "local[*]";

	/**
	 * How many RDD partitions to use?
	 */
	public static int PARTITIONS = 5;
	
	// paths to local and s3 files
	public static String GRAPH_A_FILE = "target/graph_a.txt";
	public static String GRAPH_C_FILE = "target/graph_c.txt";
	public static String GRAPH_UA_FILE = "target/graph_ua.txt";
	public static String GRAPH_UC_FILE = "target/graph_uc.txt";
	public static String GRAPH_UU_FILE = "target/graph_uu.txt";
	public static String GRAPH_USERS_FILE = "target/graph_users.txt";
	public static String GRAPH_TILDE_FILE = "target/graph_tilde.txt";
	public static String GRAPH_A_S3 = "s3a://upenn-nets2120-g16/graph_a.txt";
	public static String GRAPH_C_S3 = "s3a://upenn-nets2120-g16/graph_c.txt";
	public static String GRAPH_UA_S3 = "s3a://upenn-nets2120-g16/graph_ua.txt";
	public static String GRAPH_UC_S3 = "s3a://upenn-nets2120-g16/graph_uc.txt";
	public static String GRAPH_UU_S3 = "s3a://upenn-nets2120-g16/graph_uu.txt";
	public static String GRAPH_USERS_S3 = "s3a://upenn-nets2120-g16/graph_users.txt";
	public static String GRAPH_TILDE_S3 = "s3a://upenn-nets2120-g16/graph_tilde.txt";
	public static String BUCKET_NAME = "upenn-nets2120-g16";
	
}
