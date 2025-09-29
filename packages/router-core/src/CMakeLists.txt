# Set the minimum required version of CMake
cmake_minimum_required(VERSION 3.13)

# Set the project name and version
project(SeaSightRouter VERSION 0.1.0)

# Set the C++ standard to C++17
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -pthread -s WASM_BIGINT")

# Add a message to indicate the project is being configured
message(STATUS "Configuring SeaSightRouter for WebAssembly")

# Add the main C++ source file to a variable
set(ROUTER_SOURCES
    main.cpp
    isochrone_router.cpp
)

# Define the executable from the source files
add_executable(SeaSightRouter ${ROUTER_SOURCES})

# Emscripten-specific settings to generate an ES6 module (.js) with default export
set_target_properties(SeaSightRouter PROPERTIES
    SUFFIX ".js"
    LINK_FLAGS "-s NO_EXIT_RUNTIME=1 -sEXPORTED_RUNTIME_METHODS=ccall,cwrap -s EXPORT_ES6=1 -s MODULARIZE=1 -s EXPORT_NAME=SeaSightRouterModule -s ENVIRONMENT=web,worker -s ALLOW_MEMORY_GROWTH=1 -lembind -pthread -s USE_PTHREADS=1 -s PTHREAD_POOL_SIZE=4"
)

# In the future, we will add more libraries and settings here.
# For now, this provides a basic structure.
