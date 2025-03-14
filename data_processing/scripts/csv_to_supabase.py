import pandas as pd
import json
from supabase import create_client
import os
from dotenv import load_dotenv
import time
import numpy as np

# Load environment variables from .env file (if you have one)
load_dotenv()

# Supabase credentials
# You should set these as environment variables or use a .env file
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Path to the CSV file
csv_file_path = "/Users/mac/AgesaBot/all_categories_20250207_031918.csv"

# Function to read CSV and convert to JSON
def csv_to_json(csv_file):
    # Read CSV file
    print(f"Reading CSV file: {csv_file}")
    df = pd.read_csv(csv_file, low_memory=False)
    
    # Clean up column names (remove whitespace, etc.)
    df.columns = df.columns.str.strip()
    
    # Define the columns that exist in the Supabase table and are in our CSV
    # Exclude problematic columns like 'mensei', 'rgb', 'renk', 'average_rating'
    valid_columns = [
        'product_id', 'name', 'url', 'price', 'rating', 'rating_count',
        'social_proof_1', 'social_proof_2', 'social_proof_3', 'social_proof_4',
        'subcategory', 'description', 'extra_description', 'total_comment_count',
        'rating_score', 'total_rating_count', 'total_pages',
        'star_0_count', 'star_1_count', 'star_2_count', 'star_3_count',
        'star_4_count', 'star_5_count', 'total_questions', 'total_qa_pages'
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
    
    print(f"Converted {len(json_data)} records to JSON")
    return json_data

# Function to clean data for JSON serialization
def clean_for_json(data):
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

# Function to upload data to Supabase
def upload_to_supabase(data, batch_size=100):
    total_records = len(data)
    print(f"Uploading {total_records} records to Supabase in batches of {batch_size}")
    
    successful_uploads = 0
    failed_uploads = 0
    
    # Process in batches to avoid timeouts and memory issues
    for i in range(0, total_records, batch_size):
        batch = data[i:i+batch_size]
        batch_num = i // batch_size + 1
        total_batches = (total_records + batch_size - 1) // batch_size
        
        print(f"Processing batch {batch_num}/{total_batches} ({len(batch)} records)")
        
        try:
            # Clean the batch data to ensure JSON compatibility
            clean_batch = clean_for_json(batch)
            
            # Insert data into the product_inventory table
            result = supabase.table('product_inventory').upsert(clean_batch).execute()
            
            # Check for errors
            if hasattr(result, 'error') and result.error:
                print(f"Error in batch {batch_num}: {result.error}")
                failed_uploads += len(batch)
            else:
                successful_uploads += len(batch)
                print(f"Successfully uploaded batch {batch_num}")
            
            # Add a small delay to avoid rate limiting
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Exception in batch {batch_num}: {str(e)}")
            failed_uploads += len(batch)
    
    print(f"Upload complete: {successful_uploads} successful, {failed_uploads} failed")
    return successful_uploads, failed_uploads

# Main execution
if __name__ == "__main__":
    # Check if Supabase credentials are set
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials not found. Please set SUPABASE_URL and SUPABASE_KEY environment variables.")
        exit(1)
    
    # Convert CSV to JSON
    json_data = csv_to_json(csv_file_path)
    
    # Save JSON to file (optional)
    with open('product_inventory.json', 'w', encoding='utf-8') as f:
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
        
        json.dump(json_data, f, ensure_ascii=False, indent=2, cls=NpEncoder)
    
    print("JSON file saved as product_inventory.json")
    
    # Upload to Supabase
    print("Starting upload to Supabase...")
    successful, failed = upload_to_supabase(json_data)
    
    print(f"Process completed: {successful} records uploaded successfully, {failed} records failed.")