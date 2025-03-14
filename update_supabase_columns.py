import os
import pandas as pd
import json
from supabase import create_client, Client
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

# Define the path to the CSV file
csv_file_path = "/Users/mac/AgesaBot/all_categories_20250207_031918.csv"

def extract_columns_from_csv():
    """
    Read the CSV file, extract the specified columns, and prepare for Supabase update
    """
    print(f"Reading CSV file: {csv_file_path}")
    
    # Read the CSV file
    df = pd.read_csv(csv_file_path, low_memory=False)
    
    # Extract only the columns we need
    columns_to_extract = ['product_id', 'Menşei', 'RGB', 'Renk']
    
    # Check if columns exist in the dataframe
    available_columns = [col for col in columns_to_extract if col in df.columns]
    
    if len(available_columns) < len(columns_to_extract):
        missing = set(columns_to_extract) - set(available_columns)
        print(f"Warning: The following columns are missing from the CSV: {missing}")
    
    # Select only the columns we need
    df_selected = df[available_columns].copy()
    
    # Convert to records
    records = df_selected.to_dict(orient='records')
    
    # Clean the data for JSON serialization
    cleaned_records = [clean_for_json(record) for record in records]
    
    print(f"Extracted {len(cleaned_records)} records with additional columns")
    
    return cleaned_records

def clean_for_json(record):
    """
    Clean record for JSON serialization
    """
    cleaned = {}
    for key, value in record.items():
        # Handle NaN values
        if pd.isna(value):
            cleaned[key] = None
        else:
            cleaned[key] = value
    return cleaned

def add_columns_to_table(supabase):
    """
    Add the necessary columns to the Supabase table
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
        print("Attempting to add columns by updating a record...")
        
        test_record = {
            "product_id": "test_id",
            "Menşei": "test_mensei",
            "RGB": "test_rgb",
            "Renk": "test_renk"
        }
        
        try:
            # Try to upsert a test record with the new columns
            result = supabase.table("product_inventory").upsert([test_record]).execute()
            print("Successfully added columns to the table")
            
            # Delete the test record
            supabase.table("product_inventory").delete().eq("product_id", "test_id").execute()
            return True
        except Exception as e:
            print(f"Error adding columns: {str(e)}")
            print("Will try to update records anyway")
            return False
    
    except Exception as e:
        print(f"Exception checking table: {str(e)}")
        return False

def update_supabase_records(records):
    """
    Update existing records in Supabase with the additional columns
    """
    # Get Supabase credentials from environment variables
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        print("Error: Supabase credentials not found in environment variables")
        return
    
    # Initialize Supabase client
    supabase = create_client(supabase_url, supabase_key)
    
    # Try to add columns to the table
    add_columns_to_table(supabase)
    
    # Prepare for batch processing
    batch_size = 50  # Smaller batch size to avoid issues
    total_records = len(records)
    successful_updates = 0
    failed_updates = 0
    
    print(f"Starting update process to Supabase...")
    
    # Process in batches
    for i in range(0, total_records, batch_size):
        batch = records[i:i+batch_size]
        batch_num = i // batch_size + 1
        total_batches = (total_records + batch_size - 1) // batch_size
        
        print(f"Processing batch {batch_num}/{total_batches} ({len(batch)} records)...")
        
        try:
            # Prepare data for update
            update_data = []
            for record in batch:
                # Create update record with the original column names
                update_record = {
                    "product_id": str(record["product_id"]),  # Convert to string to match text column
                    "Menşei": record["Menşei"],
                    "RGB": record["RGB"],
                    "Renk": record["Renk"]
                }
                update_data.append(update_record)
            
            # Update records using upsert
            result = supabase.table("product_inventory").upsert(
                update_data, 
                on_conflict="product_id"
            ).execute()
            
            # Check result
            if hasattr(result, 'data') and result.data:
                successful_updates += len(batch)
                print(f"Batch {batch_num} updated successfully")
            else:
                failed_updates += len(batch)
                print(f"Batch {batch_num} may have failed: {result}")
            
            # Add a small delay to avoid rate limiting
            time.sleep(1)
            
        except Exception as e:
            failed_updates += len(batch)
            print(f"Exception in batch {batch_num}: {str(e)}")
            time.sleep(2)  # Longer delay after an error
    
    print(f"\nUpdate process completed:")
    print(f"- {successful_updates} records updated successfully")
    print(f"- {failed_updates} records failed to update")

if __name__ == "__main__":
    # Extract data from CSV
    records = extract_columns_from_csv()
    
    # Update records in Supabase
    update_supabase_records(records)
    
    print("\nProcess completed. Check your Supabase table for the updated columns.") 