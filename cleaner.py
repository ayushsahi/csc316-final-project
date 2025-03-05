import pandas as pd
import numpy as np
from datetime import datetime

def clean_cpi_data(input_file, output_file):
    """
    Clean the CPI dataset to focus ONLY on food-related categories from 1970 onwards.
    Excludes the 'All-items' category completely.
    
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
        'Food purchased from stores',
        'Meat',
        'Fresh or frozen meat (excluding poultry)',
        'Fresh or frozen beef',
        'Fresh or frozen pork',
        'Fresh or frozen poultry',
        'Fresh or frozen chicken',
        'Processed meat',
        'Fish, seafood and other marine products',
        'Fish',
        'Dairy products and eggs',
        'Dairy products',
        'Fresh milk',
        'Butter',
        'Cheese',
        'Eggs',
        'Bakery and cereal products (excluding baby food)',
        'Bakery products',
        'Cereal products (excluding baby food)',
        'Fruit, fruit preparations and nuts',
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
    
    # Filter to include only specific columns
    columns_to_keep = ['REF_DATE', 'GEO', 'Products and product groups', 'VALUE']
    df = df[columns_to_keep]
    
    # Save to CSV
    df.to_csv(output_file, index=False)
    print(f"Cleaned data saved to {output_file}")
    
    # Generate info about provinces
    provinces = df['GEO'].unique()
    print(f"Available provinces/regions: {provinces}")
    
    # Print some summary stats on the categories
    cat_counts = df['Products and product groups'].value_counts()
    print("\nNumber of data points per food category:")
    print(cat_counts)
    
    return df

# Example usage
if __name__ == "__main__":
    clean_cpi_data("data/data.csv", "data/food_cpi_data.csv")