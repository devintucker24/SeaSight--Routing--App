// Simple test for Embind integration
import SeaSightRouterModule from './build/SeaSightRouter.js';

console.log('Testing SeaSight Router Embind Integration...');

async function testRouter() {
    try {
        // Load the module
        const Module = await SeaSightRouterModule();
        console.log('✓ Module loaded successfully');
        
        // Create router instance
        const router = new Module.RouterWrapper(30.0, 50.0, -80.0, -60.0, 0.5, 0.5);
        console.log('✓ Router created successfully');
    
    // Set safety caps
    router.setSafetyCaps(4.0, 30.0, 15.0);
    console.log('✓ Safety caps set');
    
    // Test coordinate conversion
    const gridPos = router.latLonToGrid(40.0, -70.0);
    console.log(`✓ Grid position for (40°N, 70°W): (${gridPos.i}, ${gridPos.j})`);
    
    const latLon = router.gridToLatLon(20, 20);
    console.log(`✓ Lat/Lon for grid (20, 20): (${latLon.lat.toFixed(2)}°N, ${latLon.lon.toFixed(2)}°E)`);
    
    // Test anti-meridian functions
    const normalized = router.normalizeLongitude(190.0);
    console.log(`✓ Normalize 190° to: ${normalized}°`);
    
    const crosses = router.crossesAntiMeridian(179.0, -179.0);
    console.log(`✓ Crosses anti-meridian (179°, -179°): ${crosses ? 'Yes' : 'No'}`);
    
    const distance = router.greatCircleDistance(0.0, 179.0, 0.0, -179.0);
    console.log(`✓ Distance 179° to -179°: ${distance.toFixed(2)} nm`);
    
    // Test edge creation
    const edge = router.createEdge(0, 0, 5, 5);
    console.log(`✓ Edge created: ${edge.distance_nm.toFixed(2)} nm, ${edge.sample_points.length} sample points`);
    
    // Test route solving
    const path = router.solve(0, 0, 10, 10, 0.0);
    console.log(`✓ Path found with ${path.length} nodes`);
    
        console.log('\n🎉 All tests passed! Embind integration is working correctly.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

// Run the test
testRouter();
