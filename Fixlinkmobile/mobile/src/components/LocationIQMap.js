import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, Platform, ActivityIndicator } from 'react-native';
import { getLocationIqTileUrl, LOCATIONIQ_ACCESS_TOKEN } from '../screens/services/locationIq';

let WebView = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (err) {
    console.warn('react-native-webview not loaded:', err);
  }
}

/**
 * LocationIQ Interactive Map Component with Leaflet
 * Displays technician and customer locations with LocationIQ street tiles,
 * live radar pulse on the technician pin, and turn-by-turn route polyline.
 */
export default function LocationIQMap({
  technicianCoords,
  customerCoords,
  routeCoordinates = [],
  currentUserRole = 'technician',
  isAccepted = false,
  style,
}) {
  const webViewRef = useRef(null);

  // Determine initial center
  const initialCenter = useMemo(() => {
    if (currentUserRole === 'technician' && technicianCoords?.latitude && technicianCoords?.longitude) {
      return [technicianCoords.latitude, technicianCoords.longitude];
    }
    if (customerCoords?.latitude && customerCoords?.longitude) {
      return [customerCoords.latitude, customerCoords.longitude];
    }
    if (technicianCoords?.latitude && technicianCoords?.longitude) {
      return [technicianCoords.latitude, technicianCoords.longitude];
    }
    // Default to Bogo City, Cebu (CRMC center) if coordinates not yet available
    return [11.0500, 124.0050];
  }, [technicianCoords, customerCoords, currentUserRole]);

  // Generate self-contained Leaflet HTML with LocationIQ Street Tiles
  const mapHtml = useMemo(() => {
    const tileUrl = getLocationIqTileUrl();
    const techLat = technicianCoords?.latitude || null;
    const techLng = technicianCoords?.longitude || null;
    const techName = technicianCoords?.name ? JSON.stringify(technicianCoords.name) : '"Technician"';

    const custLat = customerCoords?.latitude || null;
    const custLng = customerCoords?.longitude || null;
    const custName = customerCoords?.name ? JSON.stringify(customerCoords.name) : '"Customer"';
    const custAddress = customerCoords?.address ? JSON.stringify(customerCoords.address) : '""';

    const isTech = currentUserRole === 'technician';
    const canLocateOther = Boolean(isAccepted);
    const routeJson = JSON.stringify(routeCoordinates || []);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body, #map { width: 100%; height: 100%; overflow: hidden; background: #eef2f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          
          /* Custom Pulse & Pin Markers */
          .pulse-wrapper {
            position: relative;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .pulse-ring {
            position: absolute;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(15, 118, 110, 0.35);
            animation: pulse-animation 1.8s infinite ease-out;
          }
          .pulse-dot {
            position: relative;
            z-index: 2;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #0F766E;
            border: 3px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 14px;
            font-weight: bold;
          }

          .customer-pin-wrapper {
            position: relative;
            width: 42px;
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .customer-pin {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: #D97706;
            border: 3px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 15px;
          }

          @keyframes pulse-animation {
            0% { transform: scale(0.6); opacity: 0.9; }
            100% { transform: scale(1.6); opacity: 0; }
          }

          .leaflet-popup-content-wrapper {
            border-radius: 12px;
            padding: 4px;
            box-shadow: 0 6px 16px rgba(0,0,0,0.18);
          }
          .custom-popup {
            font-size: 13px;
            color: #102A43;
            line-height: 1.4;
          }
          .custom-popup strong {
            display: block;
            font-size: 14px;
            margin-bottom: 3px;
          }
          .custom-popup .subtext {
            color: #5A7A91;
            font-size: 11px;
          }
          .map-watermark {
            position: absolute;
            bottom: 8px;
            right: 8px;
            background: rgba(255,255,255,0.85);
            padding: 3px 7px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            color: #486581;
            z-index: 1000;
            pointer-events: none;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
        </style>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      </head>
      <body>
        <div id="map"></div>
        <div class="map-watermark">LocationIQ Maps</div>
        <script>
          const initialCenter = [${initialCenter[0]}, ${initialCenter[1]}];
          const map = L.map('map', {
            center: initialCenter,
            zoom: 14,
            zoomControl: false,
            attributionControl: false
          });

          // LocationIQ Streets Tile Layer
          L.tileLayer('${tileUrl}', {
            maxZoom: 19,
            subdomains: 'abc'
          }).addTo(map);

          // Add Zoom control bottom right
          L.control.zoom({ position: 'bottomleft' }).addTo(map);

          let techMarker = null;
          let custMarker = null;
          let routePolyline = null;

          const techIcon = L.divIcon({
            className: 'custom-div-icon',
            html: '<div class="pulse-wrapper"><div class="pulse-ring"></div><div class="pulse-dot">🔧</div></div>',
            iconSize: [44, 44],
            iconAnchor: [22, 22]
          });

          const custIcon = L.divIcon({
            className: 'custom-div-icon',
            html: '<div class="customer-pin-wrapper"><div class="customer-pin">📍</div></div>',
            iconSize: [42, 42],
            iconAnchor: [21, 21]
          });

          const isAccepted = ${canLocateOther ? 'true' : 'false'};
          const isCurrentUserTech = ${isTech ? 'true' : 'false'};

          const techCoords = ${techLat && techLng ? `[${techLat}, ${techLng}]` : 'null'};
          const custCoords = ${custLat && custLng ? `[${custLat}, ${custLng}]` : 'null'};
          const rawRoute = ${routeJson};

          // Update or Add Technician Marker
          if (techCoords && (isCurrentUserTech || isAccepted)) {
            techMarker = L.marker(techCoords, { icon: techIcon }).addTo(map);
            const label = isCurrentUserTech ? "You (Technician)" : ("Technician: " + ${techName});
            techMarker.bindPopup('<div class="custom-popup"><strong>' + label + '</strong><span class="subtext">Live Location</span></div>');
          }

          // Update or Add Customer Marker
          if (custCoords && (!isCurrentUserTech || isAccepted)) {
            custMarker = L.marker(custCoords, { icon: custIcon }).addTo(map);
            const custLabel = !isCurrentUserTech ? "Your Location" : ("Customer: " + ${custName});
            const addrHtml = ${custAddress} ? '<br><span class="subtext">' + ${custAddress} + '</span>' : '';
            custMarker.bindPopup('<div class="custom-popup"><strong>' + custLabel + '</strong>' + addrHtml + '</div>');
          }

          // Draw Route Polyline if both exist and request is accepted
          if (isAccepted && rawRoute && rawRoute.length > 0) {
            routePolyline = L.polyline(rawRoute, {
              color: '#0F766E',
              weight: 5,
              opacity: 0.85,
              smoothFactor: 1
            }).addTo(map);
          }

          // Helper to fit markers
          window.fitMarkers = function() {
            try {
              const bounds = [];
              if (techMarker && (isCurrentUserTech || isAccepted)) bounds.push(techMarker.getLatLng());
              if (custMarker && (!isCurrentUserTech || isAccepted)) bounds.push(custMarker.getLatLng());

              if (routePolyline && routePolyline.getLatLngs().length > 0) {
                map.fitBounds(routePolyline.getBounds(), { padding: [45, 45], maxZoom: 16 });
              } else if (bounds.length > 1) {
                map.fitBounds(L.latLngBounds(bounds), { padding: [55, 55], maxZoom: 16 });
              } else if (bounds.length === 1) {
                map.setView(bounds[0], 15);
              }
            } catch (err) {}
          };

          // Auto-fit on load
          setTimeout(window.fitMarkers, 350);

          // Dynamic update helper exposed to React Native
          window.updateCustomerMarker = function(lat, lng, name, address) {
            try {
              const latLng = [lat, lng];
              if (!custMarker) {
                custMarker = L.marker(latLng, { icon: custIcon }).addTo(map);
              } else {
                custMarker.setLatLng(latLng);
              }
              const custLabel = !isCurrentUserTech ? "Your Location" : ("Customer: " + (name || "Customer"));
              const addrHtml = address ? '<br><span class="subtext">' + address + '</span>' : '';
              custMarker.bindPopup('<div class="custom-popup"><strong>' + custLabel + '</strong>' + addrHtml + '</div>');
            } catch (err) {}
          };

          window.updateTechMarker = function(lat, lng) {
            try {
              const latLng = [lat, lng];
              if (!techMarker) {
                techMarker = L.marker(latLng, { icon: techIcon }).addTo(map);
              } else {
                techMarker.setLatLng(latLng);
              }
            } catch (err) {}
          };

          window.updateRoutePolyline = function(coords) {
            try {
              if (routePolyline) {
                map.removeLayer(routePolyline);
                routePolyline = null;
              }
              if (coords && coords.length > 0) {
                routePolyline = L.polyline(coords, {
                  color: '#0F766E',
                  weight: 5,
                  opacity: 0.85,
                  smoothFactor: 1
                }).addTo(map);
              }
              window.fitMarkers();
            } catch (err) {}
          };
        </script>
      </body>
      </html>
    `;
  }, [initialCenter, currentUserRole, isAccepted]);

  // Push updated live coordinates and route to the webview without full reloads
  useEffect(() => {
    if (webViewRef.current && technicianCoords?.latitude && technicianCoords?.longitude) {
      const script = `
        if (typeof window.updateTechMarker === 'function') {
          window.updateTechMarker(${technicianCoords.latitude}, ${technicianCoords.longitude});
        }
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [technicianCoords?.latitude, technicianCoords?.longitude]);

  useEffect(() => {
    if (webViewRef.current && customerCoords?.latitude && customerCoords?.longitude) {
      const nameJson = JSON.stringify(customerCoords.name || 'Customer');
      const addrJson = JSON.stringify(customerCoords.address || '');
      const script = `
        if (typeof window.updateCustomerMarker === 'function') {
          window.updateCustomerMarker(${customerCoords.latitude}, ${customerCoords.longitude}, ${nameJson}, ${addrJson});
          if (typeof window.fitMarkers === 'function') { window.fitMarkers(); }
        }
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [customerCoords?.latitude, customerCoords?.longitude, customerCoords?.name, customerCoords?.address]);

  useEffect(() => {
    if (webViewRef.current && routeCoordinates) {
      const script = `
        if (typeof window.updateRoutePolyline === 'function') {
          window.updateRoutePolyline(${JSON.stringify(routeCoordinates)});
        }
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [routeCoordinates]);

  if (Platform.OS === 'web' || !WebView) {
    return (
      <View style={[styles.container, style]}>
        <iframe
          title="LocationIQ Map"
          srcDoc={mapHtml}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F766E" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EEF2F5',
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F8FA',
  },
});
