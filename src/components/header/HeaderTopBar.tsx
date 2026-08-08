import React, { useState, useEffect } from "react";
import { Clock, Sun, Moon, CloudRain, CloudLightning, Cloud, Wind, MapPin } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useStore } from "../../store";
import { HeaderAccountMenu } from "./HeaderAccountMenu";

export function HeaderTopBar() {
  const { language, setLanguage, theme, toggleTheme, siteSettings } = useStore();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Real dynamic weather state
  const [weatherData, setWeatherData] = useState<{
    tempC: number;
    tempF: number;
    weatherCode: number;
    windSpeed: number;
    isDay: boolean;
  }>({
    tempC: 29,
    tempF: 84,
    weatherCode: 0,
    windSpeed: 18,
    isDay: true,
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real weather data for Dakar from Open-Meteo
  useEffect(() => {
    let isMounted = true;
    const fetchRealWeather = async () => {
      try {
        const res = await fetch("https://api.open-meteo.com/v1/forecast?latitude=14.6937&longitude=-17.4441&current_weather=true");
        if (res.ok) {
          const data = await res.json();
          if (data.current_weather && isMounted) {
            const cw = data.current_weather;
            const tempC = Math.round(cw.temperature);
            const tempF = Math.round((tempC * 9) / 5 + 32);
            setWeatherData({
              tempC,
              tempF,
              weatherCode: cw.weathercode,
              windSpeed: Math.round(cw.windspeed),
              isDay: cw.is_day === 1,
            });
          }
        }
      } catch (err) {
        console.warn("Weather API fallback active:", err);
      }
    };

    fetchRealWeather();
    const weatherInterval = setInterval(fetchRealWeather, 10 * 60 * 1000); // refresh every 10 min
    return () => {
      isMounted = false;
      clearInterval(weatherInterval);
    };
  }, []);

  // Compute condition label & overlay icon based on real weather data
  const code = weatherData.weatherCode;
  let condString = "";
  let overlayIcon = null;

  if (code >= 95) {
    condString = language === "fr" ? "Orages" : "Thunderstorms";
    overlayIcon = <CloudLightning size={7} className="text-yellow-400" />;
  } else if (code >= 51) {
    condString = language === "fr" ? "Pluie & Averses" : "Rain & Showers";
    overlayIcon = <CloudRain size={7} className="text-blue-400" />;
  } else if (code === 45 || code === 48) {
    condString = language === "fr" ? "Brume" : "Foggy";
    overlayIcon = <Cloud size={7} className="text-gray-300" />;
  } else if (code >= 1 && code <= 3) {
    condString = language === "fr" ? "Partiellement Couvert" : "Partly Cloudy";
    overlayIcon = <Cloud size={7} className="text-gray-300" />;
  } else if (weatherData.windSpeed >= 25) {
    condString = language === "fr" ? "Venté" : "Windy";
    overlayIcon = <Wind size={7} className="text-slate-300" />;
  } else {
    condString = weatherData.isDay 
      ? (language === "fr" ? "Ensoleillé" : "Sunny")
      : (language === "fr" ? "Ciel Dégagé" : "Clear Night");
  }

  const tempString = `${weatherData.tempC}°C / ${weatherData.tempF}°F`;
  const isDayTheme = weatherData.isDay;

  const t = {
    date: currentTime.toLocaleDateString(
      language === "fr" ? "fr-FR" : "en-US",
      { weekday: "long", year: "numeric", month: "long", day: "numeric" },
    ),
    time: currentTime.toLocaleTimeString(
      language === "fr" ? "fr-FR" : "en-US",
      { hour: "2-digit", minute: "2-digit" },
    ),
    weather: `Dakar ${tempString} • ${condString}`
  };

  return (
    <div className={`${location.pathname === "/" ? "hidden md:block" : ""} bg-zinc-900 text-white font-sans border-b border-zinc-800 shadow-inner`}>
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex flex-row justify-between items-center text-gray-300 text-[9px] md:text-[10px] gap-2">
        <div className="flex items-center gap-3 md:gap-5">
          <span className="font-semibold uppercase tracking-widest hidden sm:inline">
            {t.date}
          </span>
          <span className="flex items-center gap-1.5 font-medium uppercase tracking-widest">
            <Clock size={11} className="text-gray-400" /> {t.time}
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <div className="relative w-4.5 h-4.5 flex items-center justify-center shrink-0">
              {isDayTheme ? (
                <Sun size={11} className="text-yellow-500 shrink-0" />
              ) : (
                <Moon size={11} className="text-blue-300 shrink-0" />
              )}
              {overlayIcon && (
                <div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-none p-0.5 border border-zinc-800 flex items-center justify-center z-10 shadow-sm">
                  {overlayIcon}
                </div>
              )}
            </div>
            <span className="uppercase tracking-widest text-gray-300">
              {t.weather}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-1 rounded-none hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
          </button>
          <div className="flex bg-black/40 p-0.5 rounded-none shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] border border-zinc-700 mr-1">
            <button
              onClick={() => setLanguage("fr")}
              className={`px-1.5 py-0.2 rounded-none text-[8px] md:text-[9px] font-bold transition-all duration-200 uppercase tracking-widest ${language === "fr" ? "bg-[#E85D42] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
            >
              FR
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`px-1.5 py-0.2 rounded-none text-[8px] md:text-[9px] font-bold transition-all duration-200 uppercase tracking-widest ${language === "en" ? "bg-[#E85D42] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/10"}`}
            >
              EN
            </button>
          </div>

          <HeaderAccountMenu />
        </div>
      </div>
    </div>
  );
}

