interface Env {
    preview: boolean;
    analyticsTrackingID: string; // GA ID
    simulateUpdate: boolean; // Must be false in release
    debugMode: boolean; // Must be false in release
    useActivityStreamCache: boolean; // Must be true in release
    endPoint: string; // Stravistix endPoint for new features
}

export let env: Env = {
    preview: false, // Must be false in release
    analyticsTrackingID: 'UA-100579281-1',
    simulateUpdate: false, // Must be false in release
    debugMode: false, // Must be false in release
    useActivityStreamCache: true, // Must be true in release
    endPoint: "https://stravistix-thomaschampagne.rhcloud.com", // StravistiX endPoint for new features
};
