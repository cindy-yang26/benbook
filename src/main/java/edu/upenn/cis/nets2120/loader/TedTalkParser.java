package edu.upenn.cis.nets2120.loader;

import java.io.IOException;
import java.io.BufferedReader;
import java.util.function.BiConsumer;

import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

// parse articles for db loading
public class TedTalkParser {
	
	public static interface TalkDescriptionHandler extends BiConsumer<String[], String[]> {
		
	};
	
	BufferedReader reader;
	static int aid_counter = 0;

	static String[] columns = {"aid", "category", "headline", "authors", "link", "short_description", "date"};
	
	/**
	 * Initialize a reader for the CSV file
	 * 
	 * @param reader
	 * @throws IOException
	 */
	public TedTalkParser(BufferedReader reader) throws IOException {
		System.setProperty("file.encoding", "UTF-8");
		this.reader = reader;
		// dont skip a line here
	}
	
	/**
	 * Read talks, one at a time, from the input file.  Call
	 * the processTalk handler if the line is OK, or processError if
	 * the line isn't parseable.
	 * 
	 * @param processTalk Function that takes an array of info about the talk, plus
	 * a (parallel) array of column names.
	 * 
	 * @throws IOException I/O error reading the file.
	 */
	public void readTalkDescriptions(BiConsumer<String[], String[]> processTalk) throws IOException {
		String nextLine;
		ObjectMapper mapper = new ObjectMapper();
		try {
			while ((nextLine = reader.readLine()) != null) {
				Map<String, String> map = mapper.readValue(nextLine, Map.class);
					// loading sept oct nov dec 2022
					if (
						Integer.parseInt(map.get("date").substring(0, 4)) + 5 == 2022 &&
						Integer.parseInt(map.get("date").substring(5, 7)) > 8
					) {
						// process talk writes to db given info
						processTalk.accept(new String[]{
							String.valueOf(aid_counter++),
							map.get("category"),
							map.get("headline"),
							map.get("authors"),
							map.get("link"),
							map.get("short_description"),
							String.valueOf(Integer.parseInt(map.get("date").substring(0, 4)) + 5) 
								+ map.get("date").substring(4)
						}, columns);
					}
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
	
	/**
	 * Close the reader
	 */
	public void shutdown() {
		try {
			reader.close();
		} catch (IOException e) {
			e.printStackTrace();
		}
	}
	
}
