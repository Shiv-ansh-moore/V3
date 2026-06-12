// Force React Native's lazy XHR module to load before early fetch calls.
// Loading it registers the native Blob networking handler used by fetch.
void globalThis.XMLHttpRequest;
