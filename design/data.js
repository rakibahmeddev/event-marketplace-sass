window.TIX = {
  pages: [
    ["01", "Style guide", "01 Style Guide.dc.html"],
    ["02", "Home", "02 Home.dc.html"],
    ["03", "Browse events", "03 Browse Events.dc.html"],
    ["04", "Event page", "04 Event Page.dc.html"],
    ["05", "Checkout & tickets", "05 Checkout and Tickets.dc.html"],
    ["06", "My tickets", "06 My Tickets.dc.html"],
    ["07", "Organizer profile", "07 Organizer Profile.dc.html"],
    ["08", "Become an organizer", "08 Become an Organizer.dc.html"],
    ["09", "Organizer dashboard", "09 Organizer Dashboard.dc.html"],
    ["10", "Scanner app", "10 Scanner App.dc.html"],
    ["11", "Supporting pages", "11 Supporting Pages.dc.html"]
  ],
  cats: [
    { name: "Music Concerts", icon: "fa-solid fa-music", n: 1240 },
    { name: "Sports Events", icon: "fa-solid fa-futbol", n: 386 },
    { name: "Workshops", icon: "fa-solid fa-screwdriver-wrench", n: 712 },
    { name: "Festivals", icon: "fa-solid fa-campground", n: 148 },
    { name: "Conferences", icon: "fa-solid fa-microphone-lines", n: 295 },
    { name: "Nightlife", icon: "fa-solid fa-martini-glass-citrus", n: 904 },
    { name: "Comedy", icon: "fa-solid fa-face-laugh-beam", n: 331 },
    { name: "Arts & Culture", icon: "fa-solid fa-palette", n: 567 }
  ],
  events: [
    { title: "Neon Tides Live — Summer Tour Finale", cat: "Music Concerts", mon: "OCT", day: "03", when: "Sat, Oct 3 · 8:00 PM", venue: "Harbor Hall, Brooklyn", priceLabel: "From $45", price: 45, org: "Pulse Live", badge: "fast", img: "concert crowd" },
    { title: "City Derby: Riverside FC vs. Northgate", cat: "Sports Events", mon: "OCT", day: "04", when: "Sun, Oct 4 · 3:30 PM", venue: "Riverside Stadium, Chicago", priceLabel: "From $28", price: 28, org: "Riverside FC", badge: "", img: "stadium" },
    { title: "Intro to Ceramics: Wheel Throwing", cat: "Workshops", mon: "OCT", day: "03", when: "Sat, Oct 3 · 10:00 AM", venue: "Clay Collective, Austin", priceLabel: "From $65", price: 65, org: "Clay Collective", badge: "fast", img: "workshop hands" },
    { title: "Harbourlight Music Festival 2026", cat: "Festivals", mon: "OCT", day: "17", when: "Oct 17–18 · 12:00 PM", venue: "Bayfront Park, Miami", priceLabel: "From $89", price: 89, org: "Harbourlight", badge: "", img: "festival stage" },
    { title: "ProductCon West: Building with AI", cat: "Conferences", mon: "OCT", day: "22", when: "Thu, Oct 22 · 9:00 AM", venue: "Moscone South, San Francisco", priceLabel: "From $199", price: 199, org: "ProductCon", badge: "", img: "conference keynote" },
    { title: "Midnight Warehouse: Techno All-Nighter", cat: "Nightlife", mon: "OCT", day: "03", when: "Sat, Oct 3 · 11:00 PM", venue: "Dock 9, Brooklyn", priceLabel: "From $25", price: 25, org: "Dock 9 Nights", badge: "sold", img: "club lights" },
    { title: "Stand-Up Saturdays with Priya Rao", cat: "Comedy", mon: "OCT", day: "10", when: "Sat, Oct 10 · 7:30 PM", venue: "The Laugh Cellar, Austin", priceLabel: "From $18", price: 18, org: "Laugh Cellar", badge: "", img: "comedy stage" },
    { title: "Open Studios: Contemporary Print Fair", cat: "Arts & Culture", mon: "OCT", day: "04", when: "Sun, Oct 4 · 11:00 AM", venue: "Mill Street Gallery, Seattle", priceLabel: "Free", price: 0, org: "Mill Street Arts", badge: "", img: "gallery" },
    { title: "Sunset Rooftop Jazz Sessions", cat: "Music Concerts", mon: "OCT", day: "04", when: "Sun, Oct 4 · 6:00 PM", venue: "Skyline Terrace, Los Angeles", priceLabel: "From $35", price: 35, org: "Pulse Live", badge: "fast", img: "rooftop jazz" },
    { title: "Riverside Half Marathon 2026", cat: "Sports Events", mon: "OCT", day: "11", when: "Sun, Oct 11 · 7:00 AM", venue: "Lakefront Trail, Chicago", priceLabel: "From $55", price: 55, org: "RunChi", badge: "", img: "runners" },
    { title: "UX Writing Masterclass (Online)", cat: "Workshops", mon: "OCT", day: "14", when: "Wed, Oct 14 · 6:00 PM", venue: "Online event", priceLabel: "From $40", price: 40, org: "WordCraft", badge: "", img: "laptop workshop" },
    { title: "Street Food & Vinyl Night Market", cat: "Festivals", mon: "OCT", day: "03", when: "Sat, Oct 3 · 5:00 PM", venue: "Pier 17, New York", priceLabel: "Free", price: 0, org: "Night Market Co.", badge: "", img: "night market" }
  ],
  cities: [
    { name: "New York", n: "2,140 events" },
    { name: "Los Angeles", n: "1,520 events" },
    { name: "Chicago", n: "980 events" },
    { name: "Austin", n: "760 events" },
    { name: "Miami", n: "640 events" },
    { name: "Seattle", n: "590 events" }
  ],
  orgs: [
    { name: "Pulse Live", ini: "PL", cat: "Concert promoter", followers: "24.8k", events: "32 upcoming" },
    { name: "Clay Collective", ini: "CC", cat: "Craft workshops", followers: "6.1k", events: "14 upcoming" },
    { name: "Harbourlight", ini: "HL", cat: "Festivals", followers: "41.2k", events: "3 upcoming" },
    { name: "Laugh Cellar", ini: "LC", cat: "Comedy club", followers: "9.7k", events: "21 upcoming" }
  ]
};
