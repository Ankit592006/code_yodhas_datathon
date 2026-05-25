import * as Location from 'expo-location';
import axios from 'axios';

interface EnvironmentalData {
  temp: number;
  humidity: number;
  aqi: number;
  locationName: string;
}

export const weatherService = {
  getEnvironmentalData: async (): Promise<EnvironmentalData> => {
    try {
      // 1. Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Fallback defaults if permission denied
        return {
          temp: 24.0,
          humidity: 55,
          aqi: 45,
          locationName: 'Location Denied (Using Defaults)',
        };
      }

      // 2. Get current location coordinates
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // 3. Fetch weather (temp & humidity) from Open-Meteo
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m`;
      const weatherResponse = await axios.get(weatherUrl);
      const temp = weatherResponse.data?.current?.temperature_2m ?? 23.5;
      const humidity = weatherResponse.data?.current?.relative_humidity_2m ?? 50;

      // 4. Fetch AQI from Open-Meteo Air Quality API
      const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi`;
      let aqi = 42; // default safe fallback
      try {
        const aqiResponse = await axios.get(aqiUrl);
        aqi = aqiResponse.data?.current?.us_aqi ?? 42;
      } catch (err) {
        console.warn('AQI API failed, using default', err);
      }

      // 5. Get location city name via reverse geocoding
      let locationName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (geocode && geocode.length > 0) {
          const city = geocode[0].city || geocode[0].district;
          const country = geocode[0].country;
          if (city) {
            locationName = `${city}, ${country}`;
          }
        }
      } catch (err) {
        console.warn('Geocoding failed, using coordinates', err);
      }

      return {
        temp,
        humidity,
        aqi,
        locationName,
      };
    } catch (error) {
      console.error('Error fetching environmental data:', error);
      return {
        temp: 22.0,
        humidity: 60,
        aqi: 50,
        locationName: 'Default Staging',
      };
    }
  },
};
