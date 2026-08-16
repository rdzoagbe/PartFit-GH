const CFG = {
  wa: '233551234567',
  pickup: 'PartFit Ghana — Spintex Pickup',
  addr: 'Spintex Road, Accra (near Shell Spintex)',
  hours: 'Mon–Sat · 8:30 AM–6:00 PM'
};

/* Delivery pricing — flat fee per area (editable placeholders for the demo).
   Pickup is always free. When real payment (MoMo) is wired, these fees must be
   owned/recomputed server-side so the charged amount can't be tampered with. */
const DELIVERY = {
  note: 'Delivery fees are estimates for Greater Accra and confirmed with your final price.',
  zones: [
    { id: 'spintex',      label: 'Spintex / Baatsona / Coastal Estates', fee: 20 },
    { id: 'eastlegon',    label: 'East Legon / Airport / Cantonments',   fee: 30 },
    { id: 'central',      label: 'Accra Central / Osu / Labadi',         fee: 35 },
    { id: 'achimota',     label: 'Achimota / Legon / Madina',            fee: 35 },
    { id: 'tema',         label: 'Tema / Communities',                   fee: 45 },
    { id: 'kasoa',        label: 'Kasoa / Weija / Mallam',               fee: 50 },
    { id: 'accra-other',  label: 'Other Greater Accra',                  fee: 60 },
    { id: 'nationwide',   label: 'Outside Accra (nationwide courier)',   fee: 90 }
  ]
};

const IMG = {
  spark: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Spark_plugs.jpg?width=640',
  air: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Air_filter_for_Toyota_1KR-FE.jpg?width=640',
  cabin: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Filtro_abitacolo.JPG?width=640',
  oil: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Engine_oil_filter.JPG?width=640',
  brake: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Automobile_brake_pad.jpg?width=640',
  belt: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/02014_pasek_wieloklinowy_micro-v_PK.JPG?width=640'
};

const cars = {
  Toyota: ['Corolla','Yaris','Auris','RAV4'],
  Hyundai: ['i10','i20','i30','Elantra','Tucson'],
  Kia: ['Picanto','Rio','Cerato','Sportage'],
  Nissan: ['Micra','Note','Qashqai','Juke'],
  Honda: ['Jazz / Fit','Civic','CR-V'],
  Ford: ['Fiesta','Focus','C-Max','Mondeo'],
  Volkswagen: ['Polo','Golf']
};

const parts = [
  {
    id:'denso-k16tt', name:'DENSO K16TT Spark Plug', short:'K16TT', brand:'DENSO',
    cat:'Spark Plugs', price:35, stock:24, img:IMG.spark, imageNote:'Spark-plug category image',
    fitBrands:['Toyota','Hyundai','Fiat'], fitModels:['Toyota Yaris','Hyundai i20'],
    fitLevel:'catalog', badge:'Manufacturer catalogue', origin:'DENSO e-Catalogue',
    summary:'Nickel TT replacement spark plug. DENSO lists K16TT across Toyota and Hyundai applications; final fitment is confirmed against the exact engine/OE reference.',
    specs:[['Part number','K16TT'],['Type','Nickel TT'],['Brand','DENSO'],['Fitment','Vehicle/OE lookup']],
    source:'https://www.denso-am.eu/catalog/pv/8321/part/K16TT'
  },
  {
    id:'air-1kr', name:'Engine Air Filter — Toyota 1KR-FE type', short:'PF-AF-1KR', brand:'Aftermarket',
    cat:'Air Filters', price:85, stock:10, img:IMG.air, imageNote:'Photo depicts an air filter for Toyota 1KR-FE',
    fitBrands:['Toyota'], fitModels:['Toyota Yaris'], fitLevel:'confirm', badge:'OE reference required',
    origin:'Supplier reference pending',
    summary:'Panel-style engine air filter for Toyota 1KR-FE applications. The product image accurately shows the filter type; the sellable SKU must be matched to the supplier OE cross-reference before launch.',
    specs:[['Type','Panel air filter'],['Engine family','1KR-FE type'],['Status','Sample line'],['Check','OE / VIN']],
    source:'https://commons.wikimedia.org/wiki/File:Air_filter_for_Toyota_1KR-FE.jpg'
  },
  {
    id:'bosch-cabin-5002', name:'Bosch Cabin Filter 1987435002', short:'1987435002', brand:'Bosch',
    cat:'Cabin Filters', price:95, stock:8, img:IMG.cabin, imageNote:'Cabin-filter category image',
    fitBrands:[], fitModels:[], fitLevel:'catalog', badge:'Bosch catalogue data',
    origin:'Bosch AutoParts Catalogue',
    summary:'Standard particulate cabin filter. Bosch lists 20 compatible vehicle variants for this reference in its catalogue.',
    specs:[['Length','258 mm'],['Width','224 mm'],['Height','35.5 mm'],['Type','Particulate']],
    source:'https://ap-ecat.boschaftermarket.com/SG/en_SG/products/1987435002'
  },
  {
    id:'bosch-cabin-2113', name:'Bosch Cabin Filter M 2113', short:'1987432113', brand:'Bosch',
    cat:'Cabin Filters', price:90, stock:7, img:IMG.cabin, imageNote:'Cabin-filter category image',
    fitBrands:[], fitModels:[], fitLevel:'catalog', badge:'Bosch catalogue data',
    origin:'Bosch AutoParts Catalogue',
    summary:'Standard multilayer particulate cabin filter. Bosch lists 15 compatible vehicle variants for this reference.',
    specs:[['Length','235 mm'],['Width','210 mm'],['Height','35 mm'],['Short code','M 2113']],
    source:'https://ap-ecat.boschaftermarket.com/SG/en_SG/products/1987432113'
  },
  {
    id:'oil-spin', name:'Spin-On Engine Oil Filter — Sample Line', short:'PF-OF-01', brand:'Aftermarket',
    cat:'Oil Filters', price:50, stock:18, img:IMG.oil, imageNote:'Automotive spin-on oil-filter image',
    fitBrands:[], fitModels:[], fitLevel:'confirm', badge:'Fitment to confirm',
    origin:'Supplier SKU required',
    summary:'Common spin-on oil-filter format for sample stock. Thread, gasket diameter, bypass specification and OE cross-reference must be confirmed before assigning vehicle fitment.',
    specs:[['Style','Spin-on'],['Stock type','High coverage'],['Reference','PF-OF-01'],['Check','OE / thread / seal']],
    source:'https://commons.wikimedia.org/wiki/File:Engine_oil_filter.JPG'
  },
  {
    id:'brake-front', name:'Front Brake Pad Set — Sample Application', short:'PF-BP-101', brand:'Aftermarket',
    cat:'Brake Pads', price:120, stock:6, img:IMG.brake, imageNote:'Automobile brake-pad image',
    fitBrands:['Toyota'], fitModels:['Toyota Corolla','Toyota Yaris'], fitLevel:'confirm', badge:'Vehicle-specific',
    origin:'Supplier OE reference required',
    summary:'Front brake pads are vehicle-specific and are never treated as universal. This sample line is shown for the Toyota application group; exact pad shape and OE reference must be verified before sale.',
    specs:[['Position','Front'],['Sold as','Axle set'],['Fitment','Vehicle-specific'],['Check','VIN / OE / pad shape']],
    source:'https://commons.wikimedia.org/wiki/File:Automobile_brake_pad.jpg'
  },
  {
    id:'brake-rear', name:'Rear Brake Pad Set — Sample Application', short:'PF-BP-201', brand:'Aftermarket',
    cat:'Brake Pads', price:110, stock:5, img:IMG.brake, imageNote:'Automobile brake-pad image',
    fitBrands:['Hyundai','Kia'], fitModels:['Hyundai Elantra','Kia Cerato'], fitLevel:'confirm', badge:'Vehicle-specific',
    origin:'Supplier OE reference required',
    summary:'Rear disc-brake pad sample for Hyundai/Kia applications. Some vehicles use rear drums/shoes instead, so the braking system must be checked before order confirmation.',
    specs:[['Position','Rear'],['Sold as','Axle set'],['Fitment','Vehicle-specific'],['Check','Disc vs drum + OE']],
    source:'https://commons.wikimedia.org/wiki/File:Automobile_brake_pad.jpg'
  },
  {
    id:'conti-6pk1029', name:'Continental 6PK1029 ELAST Multi-V Belt', short:'6PK1029 ELAST', brand:'Continental',
    cat:'Belts', price:140, stock:9, img:IMG.belt, imageNote:'Automotive multi-rib belt image',
    fitBrands:['Ford','Volvo'], fitModels:['Ford Focus','Ford C-Max','Ford Mondeo'], fitLevel:'catalog', badge:'Manufacturer application family',
    origin:'Continental Aftermarket',
    summary:'Elastic multi-V alternator belt. Continental identifies 6PK1029 ELAST / 6PK1059 ELAST within Ford Focus, C-Max and Mondeo 1.4/1.6 petrol and Volvo S40/C30/V50 1.6 petrol application families.',
    specs:[['Ribs','6PK'],['Length code','1029'],['Type','ELAST multi-V'],['Check','Exact engine/application']],
    source:'https://www.continental-engineparts.com/eu/en-gb/aftermarket/products/measuring-and-fitting-tools/elast-tool-f01'
  },
  {
    id:'conti-6pk1059', name:'Continental 6PK1059 ELAST Multi-V Belt', short:'6PK1059 ELAST', brand:'Continental',
    cat:'Belts', price:150, stock:6, img:IMG.belt, imageNote:'Automotive multi-rib belt image',
    fitBrands:['Ford','Volvo'], fitModels:['Ford Focus','Ford C-Max','Ford Mondeo'], fitLevel:'catalog', badge:'Manufacturer application family',
    origin:'Continental Aftermarket',
    summary:'Elastic multi-V belt in the same Continental Ford/Volvo application family. Exact belt selection depends on the vehicle configuration and must be confirmed before sale.',
    specs:[['Ribs','6PK'],['Length code','1059'],['Type','ELAST multi-V'],['Check','Exact engine/application']],
    source:'https://www.continental-engineparts.com/eu/en-gb/aftermarket/products/measuring-and-fitting-tools/elast-tool-f01'
  }
];

const cats = [
  ['All Parts','all',IMG.spark],
  ['Spark Plugs','spark',IMG.spark],
  ['Air Filters','air',IMG.air],
  ['Cabin Filters','cabin',IMG.cabin],
  ['Oil Filters','oil',IMG.oil],
  ['Brake Pads','brake',IMG.brake],
  ['Belts','belt',IMG.belt]
];
