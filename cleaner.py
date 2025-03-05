import pandas as pd
import numpy as np
from datetime import datetime

def clean_cpi_data(input_file, output_file):
    """
    Clean the CPI dataset to focus on food-related categories from 1970 onwards.
    
    Args:
        input_file (str): Path to the input CSV file
        output_file (str): Path to save the cleaned CSV file
    """
    print("Loading data...")
    # Load the data
    df = pd.read_csv(input_file)
    
    print(f"Original dataset shape: {df.shape}")
    
    # Convert REF_DATE to datetime
    df['REF_DATE'] = pd.to_datetime(df['REF_DATE'], format='%Y-%m')
    
    # Filter for dates from 1970 onwards
    df = df[df['REF_DATE'].dt.year >= 1970]
    
    print(f"Dataset after year filtering: {df.shape}")
    
    # List of food-related categories to keep
    food_categories = [
        'Food', 
        'Meat',
        'Fresh or frozen beef',
        'Fresh or frozen pork',
        'Fresh or frozen poultry',
        'Fresh or frozen chicken',
        'Processed meat',
        'Fish',
        'Dairy products',
        'Fresh milk',
        'Butter',
        'Cheese',
        'Eggs',
        'Bakery and cereal products (excluding baby food)',
        'Bakery products',
        'Cereal products (excluding baby food)',
        'Fresh fruit',
        'Preserved fruit and fruit preparations',
        'Vegetables and vegetable preparations',
        'Fresh vegetables',
        'Preserved vegetables and vegetable preparations',
        'Sugar and confectionery',
        'Edible fats and oils',
        'Coffee and tea',
        'Non-alcoholic beverages',
        'Food purchased from restaurants'
    ]
    
    # Filter only food-related categories
    df = df[df['Products and product groups'].isin(food_categories)]
    
    print(f"Dataset after category filtering: {df.shape}")
    
    # Include 'All-items' category as a reference for overall CPI
    all_items_df = pd.read_csv(input_file)
    all_items_df['REF_DATE'] = pd.to_datetime(all_items_df['REF_DATE'], format='%Y-%m')
    all_items_df = all_items_df[all_items_df['REF_DATE'].dt.year >= 1970]
    all_items_df = all_items_df[all_items_df['Products and product groups'] == 'All-items']
    
    # Combine food categories with All-items
    df = pd.concat([df, all_items_df])
    
    print(f"Final dataset shape: {df.shape}")
    
    # Filter to include only specific columns
    columns_to_keep = ['REF_DATE', 'GEO', 'Products and product groups', 'VALUE']
    df = df[columns_to_keep]
    
    # Save to CSV
    df.to_csv(output_file, index=False)
    print(f"Cleaned data saved to {output_file}")
    
    # Generate info about provinces
    provinces = df['GEO'].unique()
    print(f"Available provinces/regions: {provinces}")
    
    return df

# Example usage
if __name__ == "__main__":
    clean_cpi_data("data/data.csv", "data/food_cpi_data.csv")