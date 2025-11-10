"""
Data Fetcher for Global Energy Services Tracker
Downloads energy data from Our World in Data GitHub repository
"""

import os
import sys
import urllib.request
import json
from datetime import datetime

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Configuration
# OWID now provides CSV format - we'll use that instead
OWID_ENERGY_CSV_URL = "https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv"
DOWNLOAD_DIR = "downloads"
CACHE_DIR = "cache"

def ensure_directories():
    """Create necessary directories if they don't exist"""
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    os.makedirs(CACHE_DIR, exist_ok=True)
    print(f"✓ Directories created: {DOWNLOAD_DIR}, {CACHE_DIR}")

def download_owid_data():
    """Download Our World in Data energy dataset"""
    print("Downloading Our World in Data energy dataset...")

    try:
        # Download CSV data
        with urllib.request.urlopen(OWID_ENERGY_CSV_URL) as response:
            csv_data = response.read().decode('utf-8')

        # Save raw CSV
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        csv_filename = f"owid_energy_{timestamp}.csv"
        csv_filepath = os.path.join(DOWNLOAD_DIR, csv_filename)

        with open(csv_filepath, 'w', encoding='utf-8') as f:
            f.write(csv_data)

        # Also save as latest
        latest_csv_filepath = os.path.join(DOWNLOAD_DIR, "owid_energy_latest.csv")
        with open(latest_csv_filepath, 'w', encoding='utf-8') as f:
            f.write(csv_data)

        # Convert CSV to JSON format for easier processing
        import csv
        from io import StringIO

        reader = csv.DictReader(StringIO(csv_data))
        data = {}

        for row in reader:
            country = row.get('country', '')
            if not country:
                continue

            if country not in data:
                data[country] = {'country': country, 'data': []}

            data[country]['data'].append(row)

        # Save JSON version
        json_filename = f"owid_energy_{timestamp}.json"
        json_filepath = os.path.join(DOWNLOAD_DIR, json_filename)

        with open(json_filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

        latest_json_filepath = os.path.join(DOWNLOAD_DIR, "owid_energy_latest.json")
        with open(latest_json_filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)

        print(f"✓ Downloaded {len(data)} country records")
        print(f"✓ Saved CSV to: {csv_filepath}")
        print(f"✓ Saved JSON to: {json_filepath}")
        print(f"✓ Latest copies saved")

        return data

    except Exception as e:
        print(f"✗ Error downloading data: {e}")
        import traceback
        traceback.print_exc()
        return None

def get_data_summary(data):
    """Print summary of downloaded data"""
    if not data:
        return

    print("\n" + "="*60)
    print("DATA SUMMARY")
    print("="*60)

    # Get list of countries
    countries = list(data.keys())
    print(f"Total entities: {len(countries)}")

    # Sample one country to see available fields
    sample_country = "World"
    if sample_country in data:
        sample_data = data[sample_country]['data']
        if sample_data:
            first_record = sample_data[0]
            print(f"\nAvailable fields (from {sample_country}):")
            for key in sorted(first_record.keys()):
                print(f"  - {key}")

            # Get year range
            years = [record.get('year') for record in sample_data if record.get('year')]
            if years:
                print(f"\nYear range: {min(years)} - {max(years)}")

    print("="*60 + "\n")

def main():
    """Main execution function"""
    print("="*60)
    print("GLOBAL ENERGY SERVICES TRACKER - DATA FETCHER")
    print("="*60 + "\n")

    # Create directories
    ensure_directories()

    # Download OWID data
    data = download_owid_data()

    # Show summary
    if data:
        get_data_summary(data)
        print("✓ Data fetch complete!")
    else:
        print("✗ Data fetch failed!")

if __name__ == "__main__":
    main()
