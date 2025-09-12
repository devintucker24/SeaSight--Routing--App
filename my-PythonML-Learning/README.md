# Vessel Analysis Project

This project analyzes vessel data using Python, pandas, and SQLite. It reads vessel performance data from a CSV file and stores it in a SQLite database.

## Files

- `vessel_analysis.py` - Main Python script that processes the data
- `vessel_data.csv` - Input data file containing vessel performance metrics
- `vessel.db` - SQLite database file (created after running the script)
- `venv/` - Python virtual environment directory

## Setup Instructions

### 1. Activate the Virtual Environment

Before running the script, you need to activate the virtual environment:

```bash
source venv/bin/activate
```

You'll know it's activated when you see `(venv)` at the beginning of your terminal prompt.

### 2. Run the Analysis Script

Once the virtual environment is activated, run the script:

```bash
python vessel_analysis.py
```

### 3. Deactivate the Virtual Environment (Optional)

When you're done working, you can deactivate the virtual environment:

```bash
deactivate
```

## What the Script Does

1. **Loads data** from `vessel_data.csv` using pandas
2. **Displays the raw data** in the terminal
3. **Creates a SQLite database** called `vessel.db`
4. **Stores the data** in a table called 'logs'
5. **Confirms completion** with a success message

## Data Structure

The CSV file contains the following columns:
- `date` - Date of the measurement
- `engine_hours` - Engine running hours
- `rpm` - Engine revolutions per minute
- `speed_knots` - Vessel speed in knots
- `fuel_consumption_liters` - Fuel consumption in liters
- `distance_nm` - Distance traveled in nautical miles
- `slip_percent` - Propeller slip percentage
- `temperature_c` - Temperature in Celsius

## Troubleshooting

If you get a "ModuleNotFoundError" for pandas:
- Make sure you've activated the virtual environment with `source venv/bin/activate`
- The virtual environment should already have pandas installed

If you get an "EmptyDataError":
- Check that `vessel_data.csv` contains data
- The file should have headers and at least one row of data

## Quick Start

```bash
# Navigate to the project directory
cd /Users/VSCode\ Projects/my-PythonML-Learning

# Activate virtual environment
source venv/bin/activate

# Run the analysis
python vessel_analysis.py

# Deactivate when done (optional)
deactivate
```
