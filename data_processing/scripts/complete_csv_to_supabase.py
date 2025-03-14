import pandas as pd
import json
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import time
import numpy as np
from datetime import datetime

# Load environment variables
load_dotenv()

# Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Path to the CSV file
csv_file_path = "/Users/mac/AgesaBot/all_categories_20250207_031918.csv"

# Output directory
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "output")

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

def read_and_process_csv():
    """
    Read the CSV file, process all columns, and prepare for Supabase upload
    """
    print(f"Reading CSV file: {csv_file_path}")
    
    # Read the CSV file
    df = pd.read_csv(csv_file_path, low_memory=False)
    
    # Clean up column names (remove whitespace, etc.)
    df.columns = df.columns.str.strip()
    
    # Define the columns that exist in the Supabase table and are in our CSV
    # Include all columns, including the additional ones
    valid_columns = [
        'product_id', 'name', 'url', 'price', 'rating', 'rating_count',
        'social_proof_1', 'social_proof_2', 'social_proof_3', 'social_proof_4',
        'subcategory', 'description', 'extra_description', 'total_comment_count',
        'rating_score', 'total_rating_count', 'total_pages',
        'star_0_count', 'star_1_count', 'star_2_count', 'star_3_count',
        'star_4_count', 'star_5_count', 'total_questions', 'total_qa_pages',
        'Menşei', 'RGB', 'Renk'  # Additional columns
    ]
    
    # Filter DataFrame to only include valid columns that exist in both CSV and Supabase
    existing_valid_columns = [col for col in valid_columns if col in df.columns]
    df = df[existing_valid_columns]
    
    # Define which columns should be integers (based on your Supabase schema)
    integer_columns = [
        'rating_count', 'total_comment_count', 'total_rating_count', 'total_pages',
        'star_0_count', 'star_1_count', 'star_2_count', 'star_3_count',
        'star_4_count', 'star_5_count', 'total_questions', 'total_qa_pages'
    ]
    
    # Define which columns should be floats/numeric
    float_columns = ['rating', 'rating_score']
    
    # Convert integer columns to integers
    for col in integer_columns:
        if col in df.columns:
            # First convert to float (to handle NaN values), then to int, replacing NaN with None
            df[col] = pd.to_numeric(df[col], errors='coerce')
            # Convert float values to integers
            df[col] = df[col].apply(lambda x: int(x) if pd.notnull(x) else None)
    
    # Convert float columns to floats
    for col in float_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Replace NaN values with None (will become null in JSON)
    df = df.replace({np.nan: None})
    
    # Convert DataFrame to list of dictionaries (JSON records)
    json_data = df.to_dict(orient='records')
    
    # Ensure integer values are properly serialized as integers
    for record in json_data:
        for col in integer_columns:
            if col in record and record[col] is not None:
                record[col] = int(record[col])
        
        # Ensure product_id is a string for compatibility with Supabase
        if 'product_id' in record and record['product_id'] is not None:
            record['product_id'] = str(record['product_id'])
    
    print(f"Processed {len(json_data)} records from CSV")
    return json_data

def clean_for_json(data):
    """
    Clean data for JSON serialization
    """
    if isinstance(data, list):
        return [clean_for_json(item) for item in data]
    elif isinstance(data, dict):
        return {key: clean_for_json(value) for key, value in data.items()}
    elif isinstance(data, float) and np.isnan(data):
        return None
    elif isinstance(data, np.float64):
        return float(data)
    elif isinstance(data, np.int64):
        return int(data)
    else:
        return data

def ensure_columns_exist(supabase):
    """
    Ensure all necessary columns exist in the Supabase table
    """
    try:
        # First, check if we can access the table
        print("Checking access to product_inventory table...")
        result = supabase.table("product_inventory").select("product_id").limit(1).execute()
        
        if hasattr(result, 'data'):
            print("Successfully accessed product_inventory table")
        else:
            print("Warning: Could not access product_inventory table")
            return False
        
        # We can't directly execute ALTER TABLE commands with the Supabase client
        # Instead, we'll try to update a record with the new columns and see if it works
        print("Attempting to ensure all columns exist by updating a test record...")
        
        test_record = {
            "product_id": "test_id",
            "name": "Test Product",
            "url": "https://example.com",
            "price": 99.99,
            "rating": 4.5,
            "rating_count": 100,
            "Menşei": "test_mensei",
            "RGB": "test_rgb",
            "Renk": "test_renk"
        }
        
        try:
            # Try to upsert a test record with all columns
            result = supabase.table("product_inventory").upsert([test_record]).execute()
            print("Successfully verified all columns exist in the table")
            
            # Delete the test record
            supabase.table("product_inventory").delete().eq("product_id", "test_id").execute()
            return True
        except Exception as e:
            print(f"Error verifying columns: {str(e)}")
            print("Will try to upload records anyway")
            return False
    
    except Exception as e:
        print(f"Exception checking table: {str(e)}")
        return False

def upload_to_supabase(data, batch_size=50):
    """
    Upload data to Supabase in batches
    """
    # Initialize Supabase client
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials not found. Please set SUPABASE_URL and SUPABASE_KEY environment variables.")
        return 0, len(data)
    
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Ensure all columns exist
    ensure_columns_exist(supabase)
    
    total_records = len(data)
    print(f"Uploading {total_records} records to Supabase in batches of {batch_size}")
    
    successful_uploads = 0
    failed_uploads = 0
    
    # Create a log file for the upload process
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file_path = os.path.join(OUTPUT_DIR, f"upload_log_{timestamp}.txt")
    
    with open(log_file_path, 'w', encoding='utf-8') as log_file:
        log_file.write(f"Upload process started at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        log_file.write(f"Total records to upload: {total_records}\n\n")
        
        # Process in batches to avoid timeouts and memory issues
        for i in range(0, total_records, batch_size):
            batch = data[i:i+batch_size]
            batch_num = i // batch_size + 1
            total_batches = (total_records + batch_size - 1) // batch_size
            
            batch_message = f"Processing batch {batch_num}/{total_batches} ({len(batch)} records)"
            print(batch_message)
            log_file.write(f"{batch_message}\n")
            
            try:
                # Clean the batch data to ensure JSON compatibility
                clean_batch = clean_for_json(batch)
                
                # Insert data into the product_inventory table
                result = supabase.table('product_inventory').upsert(clean_batch).execute()
                
                # Check for errors
                if hasattr(result, 'error') and result.error:
                    error_message = f"Error in batch {batch_num}: {result.error}"
                    print(error_message)
                    log_file.write(f"{error_message}\n")
                    failed_uploads += len(batch)
                else:
                    success_message = f"Successfully uploaded batch {batch_num}"
                    print(success_message)
                    log_file.write(f"{success_message}\n")
                    successful_uploads += len(batch)
                
                # Add a small delay to avoid rate limiting
                time.sleep(1)
                
            except Exception as e:
                error_message = f"Exception in batch {batch_num}: {str(e)}"
                print(error_message)
                log_file.write(f"{error_message}\n")
                failed_uploads += len(batch)
                time.sleep(2)  # Longer delay after an error
        
        summary = f"\nUpload complete: {successful_uploads} successful, {failed_uploads} failed"
        print(summary)
        log_file.write(f"{summary}\n")
        log_file.write(f"Upload process completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    print(f"Upload log saved to {log_file_path}")
    return successful_uploads, failed_uploads

def save_json_to_file(data, filename):
    """
    Save data to a JSON file
    """
    # Generate a timestamp for the filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(OUTPUT_DIR, f"{filename}_{timestamp}.json")
    
    with open(file_path, 'w', encoding='utf-8') as f:
        # Use custom JSON encoder to handle NaN values
        class NpEncoder(json.JSONEncoder):
            def default(self, obj):
                if isinstance(obj, np.integer):
                    return int(obj)
                if isinstance(obj, np.floating):
                    return None if np.isnan(obj) else float(obj)
                if isinstance(obj, np.ndarray):
                    return obj.tolist()
                return super(NpEncoder, self).default(obj)
        
        json.dump(data, f, ensure_ascii=False, indent=2, cls=NpEncoder)
    
    print(f"JSON file saved as {file_path}")
    return file_path

if __name__ == "__main__":
    # Read and process the CSV file
    json_data = read_and_process_csv()
    
    # Save the processed data to a JSON file
    json_file_path = save_json_to_file(json_data, "product_inventory")
    
    # Upload to Supabase
    print("Starting upload to Supabase...")
    successful, failed = upload_to_supabase(json_data)
    
    print(f"Process completed: {successful} records uploaded successfully, {failed} records failed.")
    print(f"JSON backup saved to: {json_file_path}")
    print(f"Check the output directory for logs: {OUTPUT_DIR}") 