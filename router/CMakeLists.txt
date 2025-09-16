# Set the minimum required version of CMake
cmake_minimum_required(VERSION 3.13)

# Set the project name and version
project(SeaSightRouter VERSION 0.1.0)

# Set the C++ standard to C++17
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add a message to indicate the project is being configured
message(STATUS "Configuring SeaSightRouter for WebAssembly")

# Add the main C++ source file to a variable
set(ROUTER_SOURCES main.cpp)

# Define the executable from the source files
add_executable(SeaSightRouter ${ROUTER_SOURCES})

# Emscripten-specific settings to generate a standalone HTML file for testing
set_target_properties(SeaSightRouter PROPERTIES
    SUFFIX ".html"
    LINK_FLAGS "--shell-file \"${CMAKE_CURRENT_SOURCE_DIR}/shell_minimal.html\" -s NO_EXIT_RUNTIME=1 -sEXPORTED_RUNTIME_METHODS=ccall,cwrap -s EXPORT_ES6=1 -s MODULARIZE=1 -s EXPORT_NAME=SeaSightRouterModule -lembind"
)

# In the future, we will add more libraries and settings here.
# For now, this provides a basic structure.
