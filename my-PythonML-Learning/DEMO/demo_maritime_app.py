import requests
import pandas as pd
import sqlite3
import time
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import networkx as nx
from typing import List, Dict, Any, Optional

# ==========================================
# DEMO MARITIME ROUTE OPTIMIZATION APPLICATION
# ==========================================
"""
This is a demo version that includes sample AIS data so you can see the full functionality
including ML route optimization, even without real-time AIS data.
"""

# API Keys - Replace with your actual keys
TOMORROW_IO_API_KEY = "xHCjSZ79QhO9KWq3Lubr9wb081zzrgK1"  # Get from tomorrow.io

# Test location for weather data
TEST_LAT = 37.5
TEST_LON = -122.5

def create_sample_ais_data() -> List[Dict]:
    """Create sample AIS data for demonstration purposes"""
    sample_vessels = [
        {
            'mmsi': 123456789,
            'latitude': 37.7749,
            'longitude': -122.4194,
            'speed': 12.5,
            'course': 45.0,
            'timestamp': datetime.now().isoformat(),
            'vessel_name': 'Cargo Ship Alpha'
        },
        {
            'mmsi': 987654321,
            'latitude': 37.7849,
            'longitude': -122.4094,
            'speed': 8.2,
            'course': 90.0,
            'timestamp': datetime.now().isoformat(),
            'vessel_name': 'Tanker Beta'
        },
        {
            'mmsi': 456789123,
            'latitude': 37.7649,
            'longitude': -122.4294,
            'speed': 15.8,
            'course': 180.0,
            'timestamp': datetime.now().isoformat(),
            'vessel_name': 'Ferry Gamma'
        },
        {
            'mmsi': 789123456,
            'latitude': 37.7549,
            'longitude': -122.4394,
            'speed': 6.5,
            'course': 270.0,
            'timestamp': datetime.now().isoformat(),
            'vessel_name': 'Fishing Vessel Delta'
        },
        {
            'mmsi': 321654987,
            'latitude': 37.7949,
            'longitude': -122.3994,
            'speed': 18.2,
            'course': 135.0,
            'timestamp': datetime.now().isoformat(),
            'vessel_name': 'Speedboat Echo'
        }
    ]
    return sample_vessels

def fetch_open_meteo_weather(lat: float, lon: float, hours: int = 24) -> pd.DataFrame:
    """Fetch marine weather data from Open-Meteo (free, no API key needed)"""
    try:
        url = "https://marine-api.open-meteo.com/v1/marine"
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": ["wave_height", "wave_direction", "wind_wave_height", 
                      "ocean_current_velocity", "ocean_current_direction"],
            "forecast_hours": hours
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        hourly_data = data.get('hourly', {})
        
        # Create DataFrame
        df = pd.DataFrame({
            'time': pd.to_datetime(hourly_data.get('time', [])),
            'wave_height_m': hourly_data.get('wave_height', []),
            'wave_direction_deg': hourly_data.get('wave_direction', []),
            'wind_wave_height_m': hourly_data.get('wind_wave_height', []),
            'ocean_current_velocity_ms': hourly_data.get('ocean_current_velocity', []),
            'ocean_current_direction_deg': hourly_data.get('ocean_current_direction', [])
        })
        
        print(f"✓ Collected {len(df)} hours of weather data from Open-Meteo")
        return df
        
    except Exception as e:
        print(f"Error fetching Open-Meteo data: {e}")
        return pd.DataFrame()

def fetch_tomorrow_io_weather(lat: float, lon: float, api_key: str, hours: int = 24) -> pd.DataFrame:
    """Fetch weather data from Tomorrow.io (free tier, API key required)"""
    try:
        url = f"https://api.tomorrow.io/v4/timelines"
        params = {
            "location": f"{lat},{lon}",
            "fields": ["temperature", "windSpeed", "precipitationIntensity", "humidity",
                      "waveSignificantHeight", "seaCurrentSpeed", "seaCurrentDirection"],
            "timesteps": "1h",
            "units": "metric",
            "apikey": api_key
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        data = response.json()
        intervals = data.get('data', {}).get('timelines', [{}])[0].get('intervals', [])
        
        weather_data = []
        for interval in intervals[:hours]:
            values = interval.get('values', {})
            weather_data.append({
                'time': pd.to_datetime(interval.get('startTime')),
                'temperature_c': values.get('temperature'),
                'wind_speed_ms': values.get('windSpeed'),
                'precipitation_intensity': values.get('precipitationIntensity'),
                'humidity_percent': values.get('humidity'),
                'wave_significant_height_m': values.get('waveSignificantHeight'),
                'sea_current_speed_ms': values.get('seaCurrentSpeed'),
                'sea_current_direction_deg': values.get('seaCurrentDirection')
            })
        
        df = pd.DataFrame(weather_data)
        print(f"✓ Collected {len(df)} hours of weather data from Tomorrow.io")
        return df
        
    except Exception as e:
        print(f"Error fetching Tomorrow.io data: {e}")
        return pd.DataFrame()

def combine_weather_data(open_meteo_df: pd.DataFrame, tomorrow_df: pd.DataFrame) -> pd.DataFrame:
    """Combine weather data from both sources using outer join on time"""
    try:
        if open_meteo_df.empty and tomorrow_df.empty:
            return pd.DataFrame()
        
        if open_meteo_df.empty:
            return tomorrow_df
        if tomorrow_df.empty:
            return open_meteo_df
        
        # Normalize timezone for both DataFrames
        open_meteo_df['time'] = pd.to_datetime(open_meteo_df['time']).dt.tz_localize(None)
        tomorrow_df['time'] = pd.to_datetime(tomorrow_df['time']).dt.tz_localize(None)
        
        # Merge on time column
        combined_df = pd.merge(
            open_meteo_df, 
            tomorrow_df, 
            on='time', 
            how='outer',
            suffixes=('_openmeteo', '_tomorrow')
        )
        
        print(f"✓ Combined weather data: {len(combined_df)} records")
        return combined_df
        
    except Exception as e:
        print(f"Error combining weather data: {e}")
        return pd.DataFrame()

def setup_database(db_name: str = 'maritime_demo.db'):
    """Create database tables if they don't exist"""
    try:
        conn = sqlite3.connect(db_name)
        cursor = conn.cursor()
        
        # Create weather table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS weather (
                time TEXT PRIMARY KEY,
                wave_height_m REAL,
                wave_direction_deg REAL,
                wind_wave_height_m REAL,
                ocean_current_velocity_ms REAL,
                ocean_current_direction_deg REAL,
                temperature_c REAL,
                wind_speed_ms REAL,
                precipitation_intensity REAL,
                humidity_percent REAL,
                wave_significant_height_m REAL,
                sea_current_speed_ms REAL,
                sea_current_direction_deg REAL
            )
        ''')
        
        # Create AIS table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ais (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mmsi INTEGER,
                latitude REAL,
                longitude REAL,
                speed REAL,
                course REAL,
                timestamp TEXT,
                vessel_name TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
        print("✓ Database setup complete")
        
    except Exception as e:
        print(f"Error setting up database: {e}")

def store_weather_data(df: pd.DataFrame, db_name: str = 'maritime_demo.db'):
    """Store combined weather data in database"""
    try:
        if df.empty:
            print("No weather data to store")
            return
        
        conn = sqlite3.connect(db_name)
        
        # Convert datetime to string for SQLite
        df_copy = df.copy()
        df_copy['time'] = df_copy['time'].astype(str)
        
        df_copy.to_sql('weather', conn, if_exists='replace', index=False)
        conn.close()
        
        print(f"✓ Stored {len(df)} weather records in database")
        
    except Exception as e:
        print(f"Error storing weather data: {e}")

def store_ais_data(vessel_list: List[Dict], db_name: str = 'maritime_demo.db'):
    """Store AIS vessel data in database"""
    try:
        if not vessel_list:
            print("No AIS data to store")
            return
        
        conn = sqlite3.connect(db_name)
        cursor = conn.cursor()
        
        for vessel in vessel_list:
            cursor.execute('''
                INSERT INTO ais (mmsi, latitude, longitude, speed, course, timestamp, vessel_name)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                vessel.get('mmsi'),
                vessel.get('latitude'),
                vessel.get('longitude'),
                vessel.get('speed'),
                vessel.get('course'),
                vessel.get('timestamp'),
                vessel.get('vessel_name')
            ))
        
        conn.commit()
        conn.close()
        
        print(f"✓ Stored {len(vessel_list)} AIS records in database")
        
    except Exception as e:
        print(f"Error storing AIS data: {e}")

def load_data_from_db(db_name: str = 'maritime_demo.db') -> tuple:
    """Load weather and AIS data from database"""
    try:
        conn = sqlite3.connect(db_name)
        
        # Load weather data
        weather_df = pd.read_sql_query("SELECT * FROM weather", conn)
        
        # Load AIS data
        ais_df = pd.read_sql_query("SELECT * FROM ais", conn)
        
        conn.close()
        
        print(f"✓ Loaded {len(weather_df)} weather records and {len(ais_df)} AIS records")
        return weather_df, ais_df
        
    except Exception as e:
        print(f"Error loading data from database: {e}")
        return pd.DataFrame(), pd.DataFrame()

def compute_averages(weather_df: pd.DataFrame, ais_df: pd.DataFrame):
    """Compute and display average values from our data"""
    try:
        print("\n📊 MARITIME DATA ANALYSIS REPORT")
        print("=" * 50)
        
        if not weather_df.empty:
            print("\n🌊 WEATHER CONDITIONS:")
            numeric_cols = weather_df.select_dtypes(include=[np.number]).columns
            
            for col in numeric_cols:
                if weather_df[col].notna().any():
                    avg_val = weather_df[col].mean()
                    print(f"  Average {col}: {avg_val:.2f}")
        
        if not ais_df.empty:
            print("\n🚢 VESSEL ACTIVITY:")
            print(f"  Total vessels tracked: {len(ais_df)}")
            
            if 'speed' in ais_df.columns:
                avg_speed = ais_df['speed'].mean()
                print(f"  Average vessel speed: {avg_speed:.2f} knots")
            
            if 'course' in ais_df.columns:
                avg_course = ais_df['course'].mean()
                print(f"  Average vessel course: {avg_course:.2f} degrees")
        
    except Exception as e:
        print(f"Error computing averages: {e}")

def plot_vessel_positions(ais_df: pd.DataFrame, weather_df: pd.DataFrame):
    """Create visualization of vessel positions with speed-based coloring"""
    try:
        if ais_df.empty:
            print("No AIS data to plot")
            return
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Plot 1: Vessel positions colored by speed
        scatter = ax1.scatter(
            ais_df['longitude'], 
            ais_df['latitude'],
            c=ais_df['speed'],
            cmap='viridis',
            s=100,
            alpha=0.7
        )
        
        ax1.set_title('Vessel Positions (Colored by Speed)')
        ax1.set_xlabel('Longitude')
        ax1.set_ylabel('Latitude')
        ax1.grid(True, alpha=0.3)
        
        # Add colorbar
        plt.colorbar(scatter, ax=ax1, label='Speed (knots)')
        
        # Add vessel names as labels
        for idx, row in ais_df.iterrows():
            ax1.annotate(
                row['vessel_name'][:10],  # Truncate long names
                (row['longitude'], row['latitude']),
                xytext=(5, 5),
                textcoords='offset points',
                fontsize=8,
                alpha=0.8
            )
        
        # Plot 2: Weather conditions over time (if available)
        if not weather_df.empty and 'time' in weather_df.columns:
            weather_df['time'] = pd.to_datetime(weather_df['time'])
            weather_df = weather_df.sort_values('time')
            
            ax2.plot(weather_df['time'], weather_df.get('wave_height_m', 0), 
                    label='Wave Height (m)', color='blue')
            ax2.plot(weather_df['time'], weather_df.get('wind_speed_ms', 0), 
                    label='Wind Speed (m/s)', color='red')
            ax2.plot(weather_df['time'], weather_df.get('ocean_current_velocity_ms', 0), 
                    label='Current Velocity (m/s)', color='green')
            
            ax2.set_title('Weather Conditions Over Time')
            ax2.set_xlabel('Time')
            ax2.set_ylabel('Value')
            ax2.legend()
            ax2.tick_params(axis='x', rotation=45)
        
        plt.tight_layout()
        plt.savefig('maritime_analysis_demo.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        print("✓ Generated maritime analysis plots (saved as maritime_analysis_demo.png)")
        
    except Exception as e:
        print(f"Error creating plots: {e}")

def prepare_ml_data(weather_df: pd.DataFrame, ais_df: pd.DataFrame) -> tuple:
    """Prepare data for machine learning route optimization"""
    try:
        if weather_df.empty or ais_df.empty:
            print("Insufficient data for ML training")
            return None, None
        
        # Create features for route optimization
        features = []
        targets = []
        
        for idx, vessel in ais_df.iterrows():
            # Find corresponding weather conditions
            vessel_time = pd.to_datetime(vessel['timestamp'])
            
            # Get weather data closest to vessel timestamp
            weather_subset = weather_df.copy()
            weather_subset['time'] = pd.to_datetime(weather_subset['time'])
            weather_subset['time_diff'] = abs(weather_subset['time'] - vessel_time)
            
            closest_weather = weather_subset.loc[weather_subset['time_diff'].idxmin()]
            
            # Create feature vector
            feature_vector = [
                vessel['latitude'],
                vessel['longitude'],
                vessel['speed'],
                vessel['course'],
                closest_weather.get('wave_height_m', 0),
                closest_weather.get('wind_speed_ms', 0),
                closest_weather.get('ocean_current_velocity_ms', 0),
                closest_weather.get('ocean_current_direction_deg', 0),
                closest_weather.get('temperature_c', 20),
                closest_weather.get('humidity_percent', 50)
            ]
            
            # Target: optimal speed (higher in favorable conditions)
            optimal_speed = vessel['speed']
            
            # Adjust based on conditions
            if closest_weather.get('wave_height_m', 0) > 2:  # High waves
                optimal_speed *= 0.8  # Reduce speed
            elif closest_weather.get('wind_speed_ms', 0) < 5:  # Light winds
                optimal_speed *= 1.1  # Increase speed
            
            features.append(feature_vector)
            targets.append(optimal_speed)
        
        X = np.array(features)
        y = np.array(targets)
        
        print(f"✓ Prepared {len(X)} data points for ML training")
        return X, y
        
    except Exception as e:
        print(f"Error preparing ML data: {e}")
        return None, None

def train_route_optimization_model(X: np.ndarray, y: np.ndarray):
    """Train a Random Forest model for route optimization"""
    try:
        if X is None or y is None:
            return None, None
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train Random Forest model
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X_train_scaled, y_train)
        
        # Evaluate model
        train_score = model.score(X_train_scaled, y_train)
        test_score = model.score(X_test_scaled, y_test)
        
        print(f"✓ ML Model trained - Train Score: {train_score:.3f}, Test Score: {test_score:.3f}")
        return model, scaler
        
    except Exception as e:
        print(f"Error training ML model: {e}")
        return None, None

def optimize_route(start_lat: float, start_lon: float, end_lat: float, end_lon: float, 
                  model, scaler, weather_df: pd.DataFrame) -> List[tuple]:
    """Generate an optimized route using the trained model"""
    try:
        if model is None:
            return []
        
        # Create a simple route using NetworkX
        G = nx.Graph()
        
        # Generate waypoints between start and end
        num_waypoints = 10
        lats = np.linspace(start_lat, end_lat, num_waypoints)
        lons = np.linspace(start_lon, end_lon, num_waypoints)
        
        waypoints = list(zip(lats, lons))
        
        # Add nodes to graph
        for i, (lat, lon) in enumerate(waypoints):
            G.add_node(i, pos=(lat, lon))
        
        # Add edges with weights based on predicted optimal speed
        for i in range(len(waypoints) - 1):
            for j in range(i + 1, len(waypoints)):
                # Calculate distance
                dist = np.sqrt((waypoints[j][0] - waypoints[i][0])**2 + 
                              (waypoints[j][1] - waypoints[i][1])**2)
                
                # Get weather conditions for midpoint
                mid_lat = (waypoints[i][0] + waypoints[j][0]) / 2
                mid_lon = (waypoints[i][1] + waypoints[j][1]) / 2
                
                # Find closest weather data
                weather_subset = weather_df.copy()
                if not weather_df.empty:
                    weather_subset['dist'] = np.sqrt(
                        (weather_subset.get('latitude', mid_lat) - mid_lat)**2 +
                        (weather_subset.get('longitude', mid_lon) - mid_lon)**2
                    )
                    closest_weather = weather_subset.loc[weather_subset['dist'].idxmin()]
                else:
                    closest_weather = {}
                
                # Create feature vector for prediction
                features = np.array([[
                    mid_lat, mid_lon, 10, 0,  # Default speed and course
                    closest_weather.get('wave_height_m', 1),
                    closest_weather.get('wind_speed_ms', 5),
                    closest_weather.get('ocean_current_velocity_ms', 0.5),
                    closest_weather.get('ocean_current_direction_deg', 180),
                    closest_weather.get('temperature_c', 20),
                    closest_weather.get('humidity_percent', 60)
                ]])
                
                # Scale features and predict optimal speed
                features_scaled = scaler.transform(features)
                predicted_speed = model.predict(features_scaled)[0]
                
                # Weight = distance / speed (lower is better)
                weight = dist / max(predicted_speed, 0.1)
                
                G.add_edge(i, j, weight=weight)
        
        # Find shortest path
        path = nx.shortest_path(G, 0, len(waypoints) - 1, weight='weight')
        optimized_route = [waypoints[i] for i in path]
        
        print(f"✓ Generated optimized route with {len(optimized_route)} waypoints")
        return optimized_route
        
    except Exception as e:
        print(f"Error optimizing route: {e}")
        return []

def plot_optimized_route(route: List[tuple], ais_df: pd.DataFrame):
    """Plot the optimized route alongside vessel positions"""
    try:
        if not route:
            return
        
        plt.figure(figsize=(10, 8))
        
        # Plot vessel positions
        if not ais_df.empty:
            plt.scatter(ais_df['longitude'], ais_df['latitude'], 
                       c='red', s=50, alpha=0.6, label='Vessels')
        
        # Plot optimized route
        route_lats, route_lons = zip(*route)
        plt.plot(route_lons, route_lats, 'b-', linewidth=3, alpha=0.8, label='Optimized Route')
        plt.scatter(route_lons, route_lats, c='blue', s=100, alpha=1.0, label='Waypoints')
        
        plt.title('Optimized Maritime Route')
        plt.xlabel('Longitude')
        plt.ylabel('Latitude')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        plt.savefig('optimized_route_demo.png', dpi=300, bbox_inches='tight')
        plt.show()
        
        print("✓ Generated optimized route visualization (saved as optimized_route_demo.png)")
        
    except Exception as e:
        print(f"Error plotting optimized route: {e}")

def main():
    """Main function to run the complete maritime analysis demo"""
    print("🚢 MARITIME ROUTE OPTIMIZATION DEMO APPLICATION")
    print("=" * 60)
    
    # Step 1: Setup database
    print("\n1. Setting up database...")
    setup_database()
    
    # Step 2: Create sample AIS data
    print("\n2. Creating sample AIS vessel data...")
    ais_data = create_sample_ais_data()
    print(f"✓ Created {len(ais_data)} sample vessels")
    
    # Step 3: Collect weather data
    print("\n3. Collecting weather data...")
    open_meteo_data = fetch_open_meteo_weather(TEST_LAT, TEST_LON, hours=24)
    tomorrow_data = fetch_tomorrow_io_weather(TEST_LAT, TEST_LON, TOMORROW_IO_API_KEY, hours=24)
    
    # Step 4: Combine and store data
    print("\n4. Organizing data...")
    combined_weather = combine_weather_data(open_meteo_data, tomorrow_data)
    store_weather_data(combined_weather)
    store_ais_data(ais_data)
    
    # Step 5: Analyze data
    print("\n5. Investigating patterns...")
    weather_df, ais_df = load_data_from_db()
    compute_averages(weather_df, ais_df)
    plot_vessel_positions(ais_df, weather_df)
    
    # Step 6: Route optimization
    print("\n6. Optimizing routes with ML...")
    X, y = prepare_ml_data(weather_df, ais_df)
    model, scaler = train_route_optimization_model(X, y)
    
    # Generate sample optimized route
    start_lat, start_lon = 37.2, -122.8  # Near San Francisco
    end_lat, end_lon = 37.8, -122.2      # Near Oakland
    
    optimized_route = optimize_route(start_lat, start_lon, end_lat, end_lon, 
                                   model, scaler, weather_df)
    plot_optimized_route(optimized_route, ais_df)
    
    print("\n🎉 Demo complete! Check the generated plots and database.")
    print("📊 Generated files:")
    print("  - maritime_demo.db (database)")
    print("  - maritime_analysis_demo.png (vessel positions & weather)")
    print("  - optimized_route_demo.png (ML-optimized route)")

if __name__ == "__main__":
    main()
