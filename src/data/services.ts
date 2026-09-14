export type ServiceId = `studios` | `data` | `media`;

export type Service = {
  id: ServiceId;
  name: string;
  city: string;
  region: string;
  number: string;
  title: string;
  color: string;
  timezone: string;
  latitude: number;
  longitude: number;
  description: string;
  disciplines: string[];
};

export const services: Service[] = [
  {
    id: `studios`,
    number: `01`,
    name: `Geo Studios`,
    city: `Los Angeles`,
    region: `California, USA`,
    color: `#8EDCF4`,
    latitude: 34.0522,
    longitude: -118.2437,
    timezone: `America/Los_Angeles`,
    title: `Ideas into\nimpact.`,
    disciplines: [`Film & Production`, `Brand & Design`, `Creative Direction`],
    description: `Stories that move people. Experiences that stay with them. Our creative studio brings bold ideas to life, from Los Angeles to everywhere.`,
  },
  {
    id: `data`,
    number: `02`,
    name: `Geo Data`,
    city: `Atlanta`,
    region: `Georgia, USA`,
    color: `#A3C5FF`,
    latitude: 33.749,
    longitude: -84.388,
    timezone: `America/New_York`,
    title: `Clarity in\ncomplexity.`,
    disciplines: [`Data & Analytics`, `Intelligence`, `APIs & Infrastructure`],
    description: `A clearer picture. A smarter next move. We turn complex information into useful intelligence, built for a world that never stands still.`,
  },
  {
    id: `media`,
    number: `03`,
    city: `New York`,
    name: `Geo Political Media`,
    region: `New York, USA`,
    color: `#C5DAB5`,
    latitude: 40.7128,
    longitude: -74.006,
    timezone: `America/New_York`,
    title: `The world.\nIn perspective.`,
    disciplines: [`World Affairs`, `Analysis`, `Independent Storytelling`],
    description: `Beyond the headline. Closer to the story. We connect the forces, people, and ideas shaping our world, from our base in New York.`,
  },
];

export const formatServiceLocation = (service: Service) => `${service.city}, ${service.region}`;

export const formatCoordinates = (latitude: number, longitude: number) =>
  `${Math.abs(latitude).toFixed(2)}° ${latitude >= 0 ? `N` : `S`}  /  ${Math.abs(longitude).toFixed(2)}° ${longitude >= 0 ? `E` : `W`}`;
