import type { Locale } from "../i18n";

export type LocationCopy = {
  h1: string;
  title: string;
  description: string;
  intro: string;
  pickup: string;
  delivery: string;
  keywords: string;
};

export type RentalLocation = {
  slug: string;
  path: string;
  citySq: string;
  cityEn: string;
  match: string;
  mapsQuery: string;
  copy: Record<Locale, LocationCopy>;
};

export const RENTAL_LOCATIONS: RentalLocation[] = [
  {
    slug: "car-rental-tirana",
    path: "/car-rental-tirana",
    citySq: "Tiranë",
    cityEn: "Tirana",
    match: "tiran",
    mapsQuery: "Tirana Albania car rental",
    copy: {
      sq: {
        h1: "Qira makinash në Tiranë – Via Egnatia",
        title: "Qira makinash Tiranë | Auto Rental — Via Egnatia",
        description:
          "Qira makinash në Tiranë me marrje në qytet ose dërgesë. SUV, sedan dhe makinë automatike. Çmime nga euro/ditë, rezervim online ose WhatsApp.",
        intro:
          "Auto Rental — Via Egnatia ofron qira makinash në Tiranë për turistë, biznes dhe udhëtime në gjithë Shqipërinë. Zgjidh makinën, datat dhe merr çelësat në qytet — ose kërko dërgesë në adresën tënde.",
        pickup:
          "Marrja bëhet në Tiranë sipas orarit të biznesit. Koordinatat e sakta i konfirmojmë në WhatsApp pas rezervimit.",
        delivery:
          "Dërgesë në hotel, zyrë ose adresë në Tiranë me njoftim paraprak. Dërgesë edhe në Aeroportin e Tiranës.",
        keywords:
          "qira makinash tirane, rent a car tirana, auto rental tirana, qira auto tirane, car hire tirana",
      },
      en: {
        h1: "Car Rental in Tirana – Via Egnatia",
        title: "Car Rental Tirana | Auto Rental — Via Egnatia",
        description:
          "Car rental in Tirana with city pickup or delivery. SUVs, sedans and automatic cars. From €/day. Book online or on WhatsApp.",
        intro:
          "Auto Rental — Via Egnatia offers car rental in Tirana for visitors, business trips and travel across Albania. Choose your car, set the dates, and pick up in the city — or request delivery to your address.",
        pickup:
          "Pickup is in Tirana during business hours. Exact meeting point is confirmed on WhatsApp after you book.",
        delivery:
          "Hotel, office or address delivery in Tirana with notice. We also deliver to Tirana Airport.",
        keywords:
          "car rental tirana, rent a car tirana, tirana car hire, auto rental tirana albania",
      },
      it: {
        h1: "Noleggio auto a Tirana – Via Egnatia",
        title: "Noleggio auto Tirana | Auto Rental — Via Egnatia",
        description:
          "Noleggio auto a Tirana con ritiro in città o consegna. SUV, berline e automatiche. Da €/giorno. Prenota online o su WhatsApp.",
        intro:
          "Auto Rental — Via Egnatia offre noleggio auto a Tirana per turisti, lavoro e viaggi in Albania. Scegli l’auto, le date e ritira in città — oppure richiedi la consegna.",
        pickup:
          "Il ritiro è a Tirana negli orari di apertura. Il punto esatto si conferma su WhatsApp dopo la prenotazione.",
        delivery:
          "Consegna in hotel, ufficio o indirizzo a Tirana. Consegniamo anche all’aeroporto di Tirana.",
        keywords:
          "noleggio auto tirana, rent a car tirana, affitto auto tirana albania",
      },
    },
  },
  {
    slug: "car-rental-durres",
    path: "/car-rental-durres",
    citySq: "Durrës",
    cityEn: "Durrës",
    match: "durr",
    mapsQuery: "Durrës Albania car rental",
    copy: {
      sq: {
        h1: "Qira makinash në Durrës – Via Egnatia",
        title: "Qira makinash Durrës | Auto Rental — Via Egnatia",
        description:
          "Qira makinash në Durrës — porti, plazhi dhe nisja e Via Egnatia. Marrje në qytet ose dërgesë. Rezervo online ose në WhatsApp.",
        intro:
          "Durrësi është fillimi i rrugës së lashtë Via Egnatia. Këtu ofrojmë qira makinash për plazh, port dhe udhëtime drejt Tiranës, Vlorës ose jugut. Flota është e njëjtë: SUV, sedan dhe automatike.",
        pickup:
          "Marrje në Durrës (qytet / zonë portuale sipas dakordësisë). Konfirmohet në WhatsApp.",
        delivery:
          "Dërgesë në hotel ose adresë në Durrës. Mund të kthesh makinën edhe në Tiranë ose aeroport me njoftim.",
        keywords:
          "qira makinash durres, rent a car durres, car rental durres albania, qira auto durres",
      },
      en: {
        h1: "Car Rental in Durrës – Via Egnatia",
        title: "Car Rental Durrës | Auto Rental — Via Egnatia",
        description:
          "Car rental in Durrës — port, beach and the start of Via Egnatia. City pickup or delivery. Book online or on WhatsApp.",
        intro:
          "Durrës is where the ancient Via Egnatia began. Rent a car here for the coast, the port, or trips to Tirana, Vlorë and the south. Same fleet: SUVs, sedans and automatics.",
        pickup:
          "Pickup in Durrës (city / port area as agreed). Confirmed on WhatsApp.",
        delivery:
          "Hotel or address delivery in Durrës. One-way return to Tirana or the airport is possible with notice.",
        keywords:
          "car rental durres, rent a car durres albania, durres car hire, auto rental durres",
      },
      it: {
        h1: "Noleggio auto a Durazzo – Via Egnatia",
        title: "Noleggio auto Durazzo | Auto Rental — Via Egnatia",
        description:
          "Noleggio auto a Durazzo — porto, mare e inizio della Via Egnatia. Ritiro in città o consegna. Prenota online o su WhatsApp.",
        intro:
          "Durazzo è l’inizio della Via Egnatia. Noleggia un’auto per la costa, il porto o i viaggi verso Tirana, Valona e il sud.",
        pickup:
          "Ritiro a Durazzo (città / zona porto). Si conferma su WhatsApp.",
        delivery:
          "Consegna in hotel o all’indirizzo a Durazzo. Reso a Tirana o in aeroporto su richiesta.",
        keywords:
          "noleggio auto durazzo, rent a car durres, affitto auto durazzo albania",
      },
    },
  },
  {
    slug: "car-rental-vlore",
    path: "/car-rental-vlore",
    citySq: "Vlorë",
    cityEn: "Vlorë",
    match: "vlor",
    mapsQuery: "Vlorë Albania car rental",
    copy: {
      sq: {
        h1: "Qira makinash në Vlorë – Via Egnatia",
        title: "Qira makinash Vlorë | Auto Rental — Via Egnatia",
        description:
          "Qira makinash në Vlorë për Rivierën. Marrje në qytet ose dërgesë. SUV dhe automatike për Llogara dhe plazhe.",
        intro:
          "Vlora është porta e Rivierës. Me makinë nga Auto Rental shkon te Llogaraja, Dhërmiu dhe plazhet e jugut pa pritur transport. Marrje në Vlorë ose dërgesë me njoftim.",
        pickup:
          "Marrje në Vlorë sipas orarit. Pika e saktë konfirmohet në WhatsApp.",
        delivery:
          "Dërgesë në hotel në Vlorë. Kthim one-way drejt Tiranës ose aeroportit me dakordësi.",
        keywords:
          "qira makinash vlore, rent a car vlore, car rental vlora albania, qira auto vlore",
      },
      en: {
        h1: "Car Rental in Vlorë – Via Egnatia",
        title: "Car Rental Vlorë | Auto Rental — Via Egnatia",
        description:
          "Car rental in Vlorë for the Riviera. City pickup or delivery. SUVs and automatics for Llogara and the beaches.",
        intro:
          "Vlorë is the gateway to the Albanian Riviera. With a rental car you reach Llogara, Dhërmi and the south without waiting for transfers. Pickup in Vlorë or delivery on request.",
        pickup:
          "Pickup in Vlorë during business hours. Exact point confirmed on WhatsApp.",
        delivery:
          "Hotel delivery in Vlorë. One-way return to Tirana or the airport by agreement.",
        keywords:
          "car rental vlore, rent a car vlora albania, vlore car hire, auto rental vlore",
      },
      it: {
        h1: "Noleggio auto a Valona – Via Egnatia",
        title: "Noleggio auto Valona | Auto Rental — Via Egnatia",
        description:
          "Noleggio auto a Valona per la Riviera. Ritiro in città o consegna. SUV e automatiche per Llogara e le spiagge.",
        intro:
          "Valona è la porta della Riviera albanese. Con l’auto arrivi a Llogara, Dhërmi e al sud senza aspettare trasferimenti.",
        pickup:
          "Ritiro a Valona. Il punto esatto si conferma su WhatsApp.",
        delivery:
          "Consegna in hotel a Valona. Reso a Tirana o in aeroporto su accordo.",
        keywords:
          "noleggio auto valona, rent a car vlore, affitto auto valona albania",
      },
    },
  },
  {
    slug: "car-rental-sarande",
    path: "/car-rental-sarande",
    citySq: "Sarandë",
    cityEn: "Sarandë",
    match: "sarand",
    mapsQuery: "Sarandë Albania car rental",
    copy: {
      sq: {
        h1: "Qira makinash në Sarandë – Via Egnatia",
        title: "Qira makinash Sarandë | Auto Rental — Via Egnatia",
        description:
          "Qira makinash në Sarandë me dërgesë. Ideale për Ksamil, Butrint dhe Rivierën. Rezervo në WhatsApp ose online.",
        intro:
          "Saranda është baza për Ksamil, Butrint dhe bregun e jugut. Ofrojmë dërgesë makinash në Sarandë — thuaj datat në WhatsApp dhe ne sjellim makinën te hoteli.",
        pickup:
          "Marrje / dërgesë në Sarandë me njoftim (zakonisht 24 orë). Konfirmohet në WhatsApp.",
        delivery:
          "Dërgesë në hotel në Sarandë dhe Ksamil sipas disponueshmërisë. Kthim në Tiranë ose aeroport me dakordësi.",
        keywords:
          "qira makinash sarande, rent a car saranda, car rental sarande albania, qira auto ksamil",
      },
      en: {
        h1: "Car Rental in Sarandë – Via Egnatia",
        title: "Car Rental Sarandë | Auto Rental — Via Egnatia",
        description:
          "Car rental in Sarandë with delivery. Ideal for Ksamil, Butrint and the Riviera. Book on WhatsApp or online.",
        intro:
          "Sarandë is the base for Ksamil, Butrint and the southern coast. We deliver cars to Sarandë — send your dates on WhatsApp and we bring the car to your hotel.",
        pickup:
          "Pickup / delivery in Sarandë with notice (usually 24 hours). Confirmed on WhatsApp.",
        delivery:
          "Hotel delivery in Sarandë and Ksamil subject to availability. Return to Tirana or the airport by agreement.",
        keywords:
          "car rental sarande, rent a car saranda albania, ksamil car hire, auto rental sarande",
      },
      it: {
        h1: "Noleggio auto a Saranda – Via Egnatia",
        title: "Noleggio auto Saranda | Auto Rental — Via Egnatia",
        description:
          "Noleggio auto a Saranda con consegna. Ideale per Ksamil, Butrinto e la Riviera. Prenota su WhatsApp o online.",
        intro:
          "Saranda è la base per Ksamil, Butrinto e la costa sud. Consegniamo l’auto in hotel — scrivi le date su WhatsApp.",
        pickup:
          "Ritiro / consegna a Saranda con preavviso (di solito 24 ore).",
        delivery:
          "Consegna in hotel a Saranda e Ksamil. Reso a Tirana o in aeroporto su accordo.",
        keywords:
          "noleggio auto saranda, rent a car saranda, affitto auto ksamil albania",
      },
    },
  },
  {
    slug: "car-rental-airport",
    path: "/car-rental-airport",
    citySq: "Aeroporti i Tiranës",
    cityEn: "Tirana Airport",
    match: "aeroport",
    mapsQuery: "Tirana International Airport Nënë Tereza",
    copy: {
      sq: {
        h1: "Qira makinash Aeroporti i Tiranës – Via Egnatia",
        title: "Qira makinash Aeroporti Tiranë | Rent a Car TIA",
        description:
          "Car rental Tirana Airport — dërgesë dhe marrje në TIA (Nënë Tereza). Rent a car Tirana Airport, car hire Albania Airport. Rezervo para fluturimit.",
        intro:
          "Merr makinën sapo të zbardhesh në Aeroportin Ndërkombëtar të Tiranës (Nënë Tereza). Auto Rental — Via Egnatia ofron dërgesë në aeroport: na shkruaj numrin e fluturimit në WhatsApp dhe të presim me makinën.",
        pickup:
          "Marrje në TIA: të presim në zonën e mbërritjes / parking sipas dakordësisë. Dërgo numrin e fluturimit që të ndjekim vonesat.",
        delivery:
          "Dërgesë aeroporti me njoftim. Mund ta kthesh makinën në të njëjtin aeroport, në Tiranë, Durrës ose Vlorë me dakordësi.",
        keywords:
          "car rental tirana airport, rent a car tirana airport, tirana airport car hire, qira makinash aeroport tirane, car rental albania airport",
      },
      en: {
        h1: "Car Rental Tirana Airport – Via Egnatia",
        title: "Car Rental Tirana Airport | Rent a Car TIA",
        description:
          "Car rental Tirana Airport with meet & greet. Rent a car Tirana Airport, Tirana Airport car hire, car rental Albania Airport. Book before you fly.",
        intro:
          "Get your car as you land at Tirana International Airport (Nënë Tereza). Auto Rental — Via Egnatia delivers to TIA: send your flight number on WhatsApp and we wait with the car.",
        pickup:
          "Airport pickup: we meet you at arrivals / parking as agreed. Share your flight number so we can track delays.",
        delivery:
          "Airport delivery with notice. Return the car at the same airport, in Tirana, Durrës or Vlorë by agreement.",
        keywords:
          "car rental tirana airport, rent a car tirana airport, tirana airport car hire, car rental albania airport",
      },
      it: {
        h1: "Noleggio auto Aeroporto di Tirana – Via Egnatia",
        title: "Noleggio auto Aeroporto Tirana | Rent a Car TIA",
        description:
          "Noleggio auto Aeroporto di Tirana con incontro in arrivi. Prenota prima del volo su WhatsApp o online.",
        intro:
          "Ritira l’auto all’atterraggio all’Aeroporto Internazionale di Tirana (Nënë Tereza). Inviaci il numero del volo su WhatsApp e ti aspettiamo.",
        pickup:
          "Ritiro in aeroporto: ci vediamo agli arrivi / parcheggio. Comunica il numero del volo per i ritardi.",
        delivery:
          "Consegna in aeroporto. Reso nello stesso aeroporto, a Tirana, Durazzo o Valona su accordo.",
        keywords:
          "noleggio auto aeroporto tirana, rent a car tirana airport, affitto auto aeroporto albania",
      },
    },
  },
];

export function locationBySlug(slug: string) {
  return RENTAL_LOCATIONS.find((l) => l.slug === slug);
}

export function carsForLocation<T extends { location: string }>(
  cars: T[],
  loc: RentalLocation
) {
  const hit = cars.filter((c) =>
    c.location.toLowerCase().includes(loc.match)
  );
  return hit.length ? hit : cars;
}
