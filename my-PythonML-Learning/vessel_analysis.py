import pandas as pd  # This imports pandas, our data handling tool (pd is a shortcut name)
import sqlite3       # This imports SQLite for database storage

# Step 1: Load the data from CSV
data = pd.read_csv('vessel_data.csv')  # Reads the CSV file into a "DataFrame" (like a table)
print("Here's the raw data:")          # Prints a message
print(data)                            # Shows the table in your console

# Step 2: Connect to a SQLite database (creates 'vessel.db' if it doesn't exist)
conn = sqlite3.connect('vessel.db')    # Opens a connection to the database file

# Step 3: Save the data to the database in a table called 'logs'
data.to_sql('logs', conn, if_exists='replace', index=False)  # Writes the DataFrame to the DB; 'replace' overwrites if table exists

# Step 4: Close the connection (good practice)
conn.close()

print("Data stored in vessel.db!")     # Confirmation message

# Re-open the DB to query it
conn = sqlite3.connect('vessel.db')

# Load data back from DB
data_from_db = pd.read_sql_query("SELECT * FROM logs", conn)  # SQL query to get all data

# Simple analysis: Average fuel consumption
avg_fuel = data_from_db['fuel_consumption_liters'].mean()     # Calculates mean (average) of the fuel column
print(f"Average fuel consumption: {avg_fuel:.2f} liters")     # Prints it with 2 decimal places

# Plot: Speed vs. Fuel
import matplotlib.pyplot as plt                               # Imports plotting library
plt.scatter(data_from_db['speed_knots'], data_from_db['fuel_consumption_liters'])  # Scatter plot: x=speed, y=fuel
plt.xlabel('Speed (knots)')                                   # Label x-axis
plt.ylabel('Fuel Consumption (liters)')                       # Label y-axis
plt.title('Speed vs. Fuel Consumption')                       # Title
plt.show()                                                    # Displays the plot

conn.close()

import torch                                          # Imports PyTorch for ML
import torch.nn as nn                                 # For neural networks
import torch.optim as optim                           # For training

# Prepare data for ML (features: speed and RPM; target: fuel)
X = data_from_db[['speed_knots', 'rpm']].values       # Features as a numpy array
y = data_from_db['fuel_consumption_liters'].values    # Target

X = torch.tensor(X, dtype=torch.float32)              # Convert to PyTorch tensors
y = torch.tensor(y, dtype=torch.float32).view(-1, 1)  # Reshape target

# Define a simple ML model (neural network with one layer)
class FuelPredictor(nn.Module):                       # Creates a class for the model
    def __init__(self):
        super().__init__()
        self.linear = nn.Linear(2, 1)                 # Input: 2 features, output: 1 prediction

    def forward(self, x):
        return self.linear(x)                         # Simple linear prediction

model = FuelPredictor()                               # Create the model
criterion = nn.MSELoss()                              # Loss function (measures error)
optimizer = optim.SGD(model.parameters(), lr=0.001)   # Optimizer (adjusts model to reduce error)

# Train the model (loop 100 times)
for epoch in range(100):
    optimizer.zero_grad()                             # Reset gradients
    outputs = model(X)                                # Make predictions
    loss = criterion(outputs, y)                      # Calculate error
    loss.backward()                                   # Backpropagate
    optimizer.step()                                  # Update model

# Test: Predict fuel for speed=13, RPM=1850
test_input = torch.tensor([[13.0, 1850.0]])
predicted_fuel = model(test_input).item()
print(f"Predicted fuel for speed 13 knots, 1850 RPM: {predicted_fuel:.2f} liters")