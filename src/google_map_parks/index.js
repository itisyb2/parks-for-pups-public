let map;
let markers = [];
let markerCluster;
let currentInfoWindow = null;

const mapStyles = {
  default: [],
};

async function initMap() {
  const mapOptions = {
    center: { lat: 51.509865, lng: -0.118092 }, // London center
    zoom: 8,
    styles: mapStyles.default,
  };

  try {
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    const { MarkerClusterer } = await google.maps.importLibrary("marker");

    map = new Map(document.getElementById("map"), mapOptions);
    const geocoder = new google.maps.Geocoder();
    const bounds = new google.maps.LatLngBounds();

    async function addMarker(location, name, address, bookingLink) {
      try {
        const { PinElement } = await google.maps.importLibrary("marker");
        
        // Create the pin element
        const pinElement = new PinElement({
          glyph: name[0],
          background: "#EC662B",
          borderColor: "#ffffff",
          glyphColor: "#ffffff"
        });
    
        // Create the marker with the pin element
        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: location,
          map: map,
          title: name,
          content: pinElement.element // Use .element property here
        });
    
        const infoWindow = new google.maps.InfoWindow({
          content: createInfoWindowContent({ name, address, bookingLink }),
          maxWidth: 250,
        });
    
        marker.addListener("click", function () {
          if (currentInfoWindow) {
            currentInfoWindow.close();
          }
          infoWindow.open(map, marker);
          currentInfoWindow = infoWindow;
        });
    
        markers.push(marker);
        bounds.extend(location);
        
        return { 
          name, 
          address, 
          bookingLink,
          lat: location.lat(), 
          lng: location.lng() 
        };
      } catch (error) {
        console.error('Error creating marker:', error);
        return null;
      }
    }
    
    // Also update user location marker creation
    async function createUserLocationMarker(position) {
      try {
        const { PinElement } = await google.maps.importLibrary("marker");
        const pinElement = new PinElement({
          background: "#1E88E5",
          glyphColor: "#ffffff",
          borderColor: "#ffffff"
        });
    
        return new google.maps.marker.AdvancedMarkerElement({
          position,
          map,
          title: "Your location",
          content: pinElement.element // Use .element property here
        });
      } catch (error) {
        console.warn('Could not create user location marker:', error);
        return null;
      }
    }

    async function geocodeAddress(name, address, bookingLink) {
      try {
        const fullAddress = `${address}, UK`;
        
        const response = await new Promise((resolve, reject) => {
          geocoder.geocode({ address: fullAddress }, (results, status) => {
            if (status === "OK" && results && results.length > 0) {
              resolve(results);
            } else {
              const postcode = extractPostcode(address);
              if (postcode) {
                geocoder.geocode({ address: postcode + ", UK" }, (postcodeResults, postcodeStatus) => {
                  if (postcodeStatus === "OK" && postcodeResults && postcodeResults.length > 0) {
                    resolve(postcodeResults);
                  } else {
                    reject(new Error(`Geocoding failed for ${name}: ${status}`));
                  }
                });
              } else {
                reject(new Error(`Geocoding failed for ${name}: ${status}`));
              }
            }
          });
        });

        const location = response[0].geometry.location;
        return addMarker(location, name, address, bookingLink);
      } catch (error) {
        console.warn(`Failed to geocode ${name} (${address}):`, error);
        return null;
      }
    }

    function extractPostcode(address) {
      const postcodeRegex = /[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}/i;
      const match = address.match(postcodeRegex);
      return match ? match[0] : null;
    }

    const locationItems = document.querySelectorAll("[data-location-item]");
    const parkforpups = [];

    const geocodePromises = Array.from(locationItems).map((item) => {
      console.log(item)
      const name = item.querySelector("[data-location-name]")?.textContent?.trim() || "Unknown Location";
      const address = item.querySelector("[data-location-address]")?.textContent?.trim() || "";
      const bookingLink = item.querySelector("[data-booking-link]")?.getAttribute("href") || "";
      return geocodeAddress(name, address, bookingLink);
    });

    const results = await Promise.allSettled(geocodePromises);
    const successfulResults = results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value);

    if (successfulResults.length === 0) {
      throw new Error("No locations could be geocoded successfully");
    }

    parkforpups.push(...successfulResults);
    
    if (markers.length > 0) {
      map.fitBounds(bounds, { padding: 50 });
      try {
        const { MarkerClusterer } = await google.maps.importLibrary("marker");
        const renderer = {
          render: ({ count, position }) => {
            const pinElement = new google.maps.marker.PinElement({
              glyph: count.toString(),
              background: "#EC662B",
              borderColor: "#ffffff",
              glyphColor: "#ffffff",
              scale: 1.3
            });
            return new google.maps.marker.AdvancedMarkerElement({
              position,
              content: pinElement.element
            });
          }
        };
    
        markerCluster = new MarkerClusterer({
          map,
          markers,
          renderer
        });
      } catch (error) {
        console.warn("Marker clustering disabled:", error);
      }
    }
    

    function createInfoWindowContent(park) {
      return `
        <div data-info-window>
          <div data-info-header>
            <h2>${park.name}</h2>
          </div>
          <p data-info-address>${park.address}</p>
          <a 
            href="${park.bookingLink}"
            data-book-button 
            target="_blank"
            rel="noopener noreferrer"
            style="display: inline-block; padding: 8px 16px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;"
          >
            Book Now
          </a>
        </div>
      `;
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 3959; // Radius of the Earth in miles
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    async function updateParkforpupsList(userLat, userLng) {
      const parkforpupsListElement = document.getElementById("parkforpupsList");
      const locationItems = Array.from(document.querySelectorAll("[data-location-item]"));
      if (!parkforpupsListElement || locationItems.length === 0) return;
    
      try {
        // Calculate distances and create sortable array
        const itemsWithDistances = locationItems.map(item => {
          const nameEl = item.querySelector("[data-location-name]");
          const name = nameEl ? nameEl.textContent.trim() : "";
          
          // Find corresponding marker
          const marker = markers.find(m => m.title === name);
          if (!marker) return null;

          
          
         // Get position from AdvancedMarkerElement
          const markerPosition = marker.position;
          // Access lat/lng correctly
          const distance = calculateDistance(
            userLat,
            userLng,
            markerPosition.lat,
            markerPosition.lng
          );
      
          return {
            element: item,
            distance: distance
          };
        }).filter(item => item !== null);
      
        // Sort by distance
        itemsWithDistances.sort((a, b) => a.distance - b.distance);
      
        // Clear list and append in new order
        parkforpupsListElement.innerHTML = '';
        itemsWithDistances.forEach(item => {
          const distanceElement = item.element.querySelector("[data-distance-info]");
          if (distanceElement) {
            distanceElement.textContent = `${Math.round(item.distance)} miles away`;
            distanceElement.classList.remove('hide');
          }
          parkforpupsListElement.appendChild(item.element);
        });
      
        // Create user location marker
        await createUserLocationMarker({ lat: userLat, lng: userLng });
      
        // Center map and adjust zoom
        map.setCenter({ lat: userLat, lng: userLng });
        map.setZoom(10);
      } catch (error) {
        console.error('Error updating parks list:', error);
      }
    }

    async function findNearestParkforpups() {
      const postcode = document.querySelector("[data-postcode-input]")?.value;
      if (!postcode) {
        alert("Please enter a postcode");
        return;
      }
    
      try {
        const response = await new Promise((resolve, reject) => {
          geocoder.geocode({ address: postcode + ", UK" }, (results, status) => {
            if (status === "OK" && results?.length > 0) {
              resolve(results);
            } else {
              reject(new Error("Could not find this postcode"));
            }
          });
        });
    
        const location = response[0].geometry.location;
        await updateParkforpupsList(location.lat(), location.lng());
      } catch (error) {
        console.error("Geocoding error:", error);
        alert(error.message || "Could not find this postcode. Please try again.");
      }
    }

      geocoder.geocode({ address: postcode + ", UK" }, function (results, status) {
        if (status === "OK") {
          const location = results[0].geometry.location;
          updateParkforpupsList(location.lat(), location.lng());
        } else {
          alert("Could not find this postcode. Please try again.");
        }
      });
    }

    function findMe() {
      if (!navigator.geolocation) {
        alert("Your browser doesn't support geolocation. Please enter your postcode instead.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // Reverse geocode to get postcode
          geocoder.geocode({ location: pos }, (results, status) => {
            if (status === "OK" && results[0]) {
              const postalCode = results[0].address_components.find(
                component => component.types.includes("postal_code")
              );
              if (postalCode) {
                const postcodeInput = document.querySelector("[data-postcode-input]");
                if (postcodeInput) postcodeInput.value = postalCode.long_name;
                findNearestParkforpups();
              }
            }
          });

          updateParkforpupsList(pos.lat, pos.lng);
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Unable to find your location. Please enter your postcode instead.");
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }

    // Add event listeners for location items
    locationItems.forEach((item, index) => {
      item.addEventListener("mouseover", function () {
        const park = parkforpups[index];
        if (park) {
          map.setCenter({ lat: park.lat, lng: park.lng });
          map.setZoom(10);
        }
      });
    });

    // Add event listeners for search and filter functions
    document.querySelector("[data-find-postcode]")?.addEventListener("click", findNearestParkforpups);
    document.querySelector("[data-find-me]")?.addEventListener("click", findMe);

  } catch (error) {
    console.error("Error initializing map:", error);
    const mapElement = document.getElementById("map");
    if (mapElement) {
      mapElement.innerHTML = `
        <div data-error-message>
          <p>Sorry, we're having trouble loading the map right now. Please try again later.</p>
          <p>Error: ${error.message}</p>
        </div>
      `;
    }
  }
}

window.initMap = initMap;
