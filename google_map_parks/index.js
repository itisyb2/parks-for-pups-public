let map;
let markers = [];
let markerCluster;
let currentInfoWindow = null;

const mapStyles = {
  default: [],
};

async function initMap() {
  const mapOptions = {
    center: { lat: 51.509865, lng: -0.118092 },
    zoom: 8,
    styles: mapStyles.default,
  };

  const { Map } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
  const { MarkerClusterer } = await google.maps.importLibrary("marker");

  map = new Map(document.getElementById("map"), mapOptions);
  const geocoder = new google.maps.Geocoder();
  const bounds = new google.maps.LatLngBounds();

  function addMarker(location, name, address) {
    const marker = new google.maps.Marker({
      position: location,
      map: map,
      title: name,
    });

    const infoWindow = new google.maps.InfoWindow({
      content: createInfoWindowContent({ name, address }),
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
    return { name, address, lat: location.lat(), lng: location.lng() };
  }

  function geocodeAddress(name, address) {
    return new Promise((resolve, reject) => {
      geocoder.geocode({ address: address }, function (results, status) {
        if (status === "OK") {
          const location = results[0].geometry.location;
          const parkData = addMarker(location, name, address);
          resolve(parkData);
        } else {
          reject(
            "Geocode was not successful for the following reason: " + status
          );
        }
      });
    });
  }

  const locationItems = document.querySelectorAll(".home-fnp-location-item");
  const parkforpups = [];

  const geocodePromises = Array.from(locationItems).map((item) => {
    const name = item.querySelector(".heading-style-h3").textContent.trim();
    const address = item.querySelector(".text-size-medium").textContent.trim();
    return geocodeAddress(name, address);
  });

  try {
    const results = await Promise.all(geocodePromises);
    parkforpups.push(...results);
    map.fitBounds(bounds, { padding: 50 });

    // Create a MarkerClusterer
    markerCluster = new markerClusterer.MarkerClusterer({ map, markers });

    // Add event listeners to location items
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
    document
      .getElementById("findPostcode")
      .addEventListener("click", findNearestParkforpups);
    document.getElementById("findMe").addEventListener("click", findMe);
    // document.getElementById('radiusSelect').addEventListener('change', applyRadiusFilter);
    // document.getElementById('mapStyleSelect').addEventListener('change', changeMapStyle);
  } catch (error) {
    console.error("Error initializing map:", error);
  }

  // Define the functions that were previously outside initMap
  function createInfoWindowContent(park) {
    return `
      <div class="info-window" style="font-family: Arial, sans-serif; padding: 10px; max-width: 250px;">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <h2 style="font-size: 24px; margin: 0 0 5px 0;">${park.name}</h2>
         
        </div>
        <p style="font-size: 14px; margin: 0 0 10px 0;">${park.address}</p>
        <button onclick="bookNow('${park.name}')" style="background-color: #4CAF50; color: white; border: none; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer; border-radius: 4px;">Book Now</button>
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

  function findNearestParkforpups() {
    const postcode = document.getElementById("postcode").value;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: postcode }, function (results, status) {
      if (status === "OK") {
        const location = results[0].geometry.location;
        updateParkforpupsList(location.lat(), location.lng());
      } else {
        alert("Geocode was not successful for the following reason: " + status);
      }
    });
  }

  function findMe() {
    console.log("findMe function called");

    if (navigator.geolocation) {
      console.log("Geolocation is supported");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Geolocation successful, position:", position);

          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          console.log("Extracted coordinates:", pos);

         
          // Center the map on the user's location
          map.setCenter(pos);
          map.setZoom(10);

          // Add a marker for the user's location
          new google.maps.Marker({
            position: pos,
            map: map,
            title: "Your location",
            icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
          });

          // Use reverse geocoding to get the postal code
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: pos }, (results, status) => {
            if (status === "OK") {
              if (results[0]) {
                const postalCode = results[0].address_components.find(
                  (component) => component.types.includes("postal_code")
                );

                if (postalCode) {
                  console.log("Postal code found:", postalCode.long_name);
                  // Assuming you have an input field with id "pincodeInput"
                  document.getElementById("postcode").value =
                    postalCode.long_name;
                } else {
                  console.log("Postal code not found in the results");
                }
              } else {
                console.log("No results found");
              }
            } else {
              console.error("Geocoder failed due to: " + status);
            }
          });

           // Update the list immediately
           console.log("Calling updateParkforpupsList");
           updateParkforpupsList(pos.lat, pos.lng);
           console.log("updateParkforpupsList call completed");
 
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Error: The Geolocation service failed.");
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    } else {
      console.log("Geolocation is not supported by this browser");
      alert("Error: Your browser doesn't support geolocation.");
    }
  }

  function updateParkforpupsList(lat, lng) {
    const template = document.querySelector(".home-fnp-location-item");
    if (!template) {
      console.error("Template .home-fnp-location-item not found");
      return;
    }
    const parkforpupsListElement = document.getElementById("parkforpupsList");
    parkforpupsListElement.innerHTML = "";

    const sortedParkforpups = parkforpups
      .map((park) => {
        const distance = calculateDistance(lat, lng, park.lat, park.lng);
        return { ...park, distance };
      })
      .sort((a, b) => a.distance - b.distance);

    sortedParkforpups.forEach((park) => {
      const parkItem = template.cloneNode(true);

      const nameElement = parkItem.querySelector(".heading-style-h3");
      if (nameElement) nameElement.textContent = park.name;

      const addressElement = parkItem.querySelector(".text-size-medium");
      if (addressElement) addressElement.textContent = park.address;

      const existingDistances = parkItem.querySelectorAll(".distance-info");
      existingDistances.forEach((el) => el.remove());

      // Add new distance information
      const distanceInfo = document.createElement("div");
      distanceInfo.className = "text-size-medium distance-info";
      distanceInfo.textContent = `${Math.round(park.distance)} miles away`;
      parkItem
        .querySelector(".home-fnp-location-item-name")
        .appendChild(distanceInfo);

      // Update the "Book Now" button
      const bookButton = parkItem.querySelector(".button.w-button");
      if (bookButton) {
        bookButton.href = "#";
        bookButton.onclick = (e) => {
          e.preventDefault();
          bookNow(park.name);
        };
      }

      // Add click event to the whole item
      parkItem.addEventListener("click", () => {
        const marker = markers.find((m) => m.getTitle() === park.name);
        if (marker) {
          map.setCenter(marker.getPosition());
          map.setZoom(14);
          google.maps.event.trigger(marker, "click");
        }
      });

      parkforpupsListElement.appendChild(parkItem);
    });

    // Center map on user location
    map.setCenter({ lat, lng });
    map.setZoom(10);

    // Add a marker for the user's location
    new google.maps.Marker({
      position: { lat, lng },
      map: map,
      title: "Your location",
      icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    });

    applyRadiusFilter();
  }

  function applyRadiusFilter() {
    const radius = parseInt(document.getElementById("radiusSelect").value);
    const center = map.getCenter();

    markers.forEach((marker) => {
      const distance = calculateDistance(
        center.lat(),
        center.lng(),
        marker.getPosition().lat(),
        marker.getPosition().lng()
      );
      if (distance <= radius) {
        marker.setMap(map);
      } else {
        marker.setMap(null);
      }
    });

    markerCluster.clearMarkers();
    markerCluster.addMarkers(
      markers.filter((marker) => marker.getMap() !== null)
    );
  }

  function changeMapStyle() {
    const style = document.getElementById("mapStyleSelect").value;
    map.setOptions({ styles: mapStyles[style] });
  }

  function bookNow(parkName) {
    alert(
      `Booking ${parkName}. This is where you would implement the booking logic.`
    );
  }
}

// Initialize the map when the page loads
window.onload = initMap;


