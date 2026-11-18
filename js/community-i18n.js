/* Strings and name translations for the community data page and map. Language comes from <html lang>. */
(function () {
  'use strict';

  var DICT = {
    en: {
      'scope.metro.note': 'Kansas City area: Wyandotte, Johnson, Leavenworth, Miami, Jackson, Clay, Platte and Cass counties combined.',
      'scope.ks.note': 'All of Kansas.',
      'scope.metro.name': 'the Kansas City area',
      'scope.ks.name': 'Kansas',
      'stat.now': 'foreign-born residents in {scope}, {window}',
      'stat.change': 'more than in {window}, about {n} people',
      'stat.share': 'of all residents, up from {x}%',
      'stat.fastest': 'growth in residents born in {region}, the fastest-growing region',
      'bars.scale': 'All bars use one scale, 0 to {max} percent. Counties and areas use the same 5-year Census estimate.',
      'bars.county': '{name} County, {st}',
      'city.residents': '{n} residents',
      'line.aria': 'Foreign-born residents by year',
      'line.note.share': 'Foreign-born residents as a share of everyone living in {scope}.',
      'line.note.num': 'Foreign-born residents of {scope}. Each point is a Census 5-year estimate ending in that year.',
      'stack.aria': 'Foreign-born residents by region of birth and year',
      'change.title': 'Change since {window}',
      'table.na': 'Not yet loaded',
      'regionmix.total': '{n} born abroad',
      'regionmix.aria': '{name} County birth regions: {list}',
      'updated': 'Census ACS {period}. Last updated {date}.',
      'measure.fb.label': 'Born outside the U.S.',
      'measure.fb.note': '% of residents',
      'measure.ne.label': 'Non-English at home',
      'measure.ne.note': '% of residents age 5+',
      'measure.gr.label': 'Growth since 2010',
      'measure.gr.note': '% more foreign-born residents',
      'rough.suffix': ', rough estimate',
      'city.aria': '{name}, {st}: {pct}% born outside the U.S., {n} residents',
      'legend.under': 'under {x}%',
      'legend.over': '{x}% or more',
      'legend.rough': 'rough estimate',
      'legend.citySized': 'city, sized by population',
      'legend.city': 'city',
      'map.note': '{label}, as a {note}.',
      'map.dotsNote': ' City dots show size only for this measure.',
      'rank.na': 'n/a',
      'rank.format': '#{i} of {n}',
      'spark.aria': 'Foreign-born residents: {a} in {w0} to {b} in {w1}',
      'spark.change': '{sign}{n} people{pct}',
      'spark.title': 'Change in foreign-born residents since {w}',
      'spark.flagged': 'Small counties vary from year to year, so read the overall direction, not single dips. Each point is a rolling 5-year estimate.',
      'spark.normal': 'Each point is a rolling 5-year Census estimate, so single years blend together.',
      'detail.bornAbroad': 'Born outside U.S.',
      'detail.nonEnglish': 'Non-English at home',
      'detail.population': 'Population',
      'detail.foreignBorn': 'Foreign-born residents',
      'detail.growth': 'Growth since 2010',
      'detail.birthplace': 'Most common birthplace',
      'detail.noData': 'No data',
      'detail.title': '{name} County',
      'detail.rank': 'In this view: {share} by share, {count} by number of people.',
      'detail.warn': 'Small county: this estimate is rougher than the others, so compare with care.',
      'city.born': 'Born outside the U.S. (city)',
      'city.moe': 'Margin of error',
      'city.residentsLabel': 'Residents',
      'city.note': 'Cities cross county lines, so a city share can differ from its county.',
      'copy.label': 'Copy link to this county',
      'copy.done': 'Link copied',
      'hint': 'Hover, tap or tab to a county or city to see its numbers.',
      'rank.title': 'Highest counties: {label}'
    },
    es: {
      'scope.metro.note': 'Área de Kansas City: los condados de Wyandotte, Johnson, Leavenworth, Miami, Jackson, Clay, Platte y Cass combinados.',
      'scope.ks.note': 'Todo Kansas.',
      'scope.metro.name': 'el área de Kansas City',
      'scope.ks.name': 'Kansas',
      'stat.now': 'residentes nacidos en el extranjero en {scope}, {window}',
      'stat.change': 'más que en {window}, unas {n} personas',
      'stat.share': 'de todos los residentes, frente a {x}% antes',
      'stat.fastest': 'crecimiento de residentes nacidos en {region}, la región que más crece',
      'bars.scale': 'Todas las barras usan la misma escala, de 0 a {max} por ciento. Los condados y las áreas usan la misma estimación quinquenal del Censo.',
      'bars.county': 'Condado de {name}, {st}',
      'city.residents': '{n} residentes',
      'line.aria': 'Residentes nacidos en el extranjero por año',
      'line.note.share': 'Residentes nacidos en el extranjero como proporción de todas las personas que viven en {scope}.',
      'line.note.num': 'Residentes nacidos en el extranjero en {scope}. Cada punto es una estimación quinquenal del Censo que termina en ese año.',
      'stack.aria': 'Residentes nacidos en el extranjero por región de nacimiento y año',
      'change.title': 'Cambio desde {window}',
      'table.na': 'Aún no cargado',
      'regionmix.total': '{n} nacidos en el extranjero',
      'regionmix.aria': 'Regiones de nacimiento en el condado de {name}: {list}',
      'updated': 'Censo ACS {period}. Última actualización: {date}.',
      'measure.fb.label': 'Nacidos fuera de EE. UU.',
      'measure.fb.note': '% de los residentes',
      'measure.ne.label': 'Idioma distinto del inglés en casa',
      'measure.ne.note': '% de residentes de 5 años o más',
      'measure.gr.label': 'Crecimiento desde 2010',
      'measure.gr.note': '% más de residentes nacidos en el extranjero',
      'rough.suffix': ', estimación aproximada',
      'city.aria': '{name}, {st}: {pct}% nacidos fuera de EE. UU., {n} residentes',
      'legend.under': 'menos de {x}%',
      'legend.over': '{x}% o más',
      'legend.rough': 'estimación aproximada',
      'legend.citySized': 'ciudad, tamaño según la población',
      'legend.city': 'ciudad',
      'map.note': '{label}, como {note}.',
      'map.dotsNote': ' Los puntos de las ciudades solo muestran el tamaño en esta medida.',
      'rank.na': 'n/d',
      'rank.format': '#{i} de {n}',
      'spark.aria': 'Residentes nacidos en el extranjero: {a} en {w0} a {b} en {w1}',
      'spark.change': '{sign}{n} personas{pct}',
      'spark.title': 'Cambio en residentes nacidos en el extranjero desde {w}',
      'spark.flagged': 'Los condados pequeños varían de un año a otro, así que mira la dirección general y no las caídas aisladas. Cada punto es una estimación quinquenal móvil.',
      'spark.normal': 'Cada punto es una estimación quinquenal móvil del Censo, así que los años sueltos se mezclan entre sí.',
      'detail.bornAbroad': 'Nacidos fuera de EE. UU.',
      'detail.nonEnglish': 'Idioma distinto del inglés en casa',
      'detail.population': 'Población',
      'detail.foreignBorn': 'Residentes nacidos en el extranjero',
      'detail.growth': 'Crecimiento desde 2010',
      'detail.birthplace': 'Lugar de nacimiento más común',
      'detail.noData': 'Sin datos',
      'detail.title': 'Condado de {name}',
      'detail.rank': 'En esta vista: {share} por porcentaje, {count} por número de personas.',
      'detail.warn': 'Condado pequeño: esta estimación es menos precisa que las demás, así que compárala con cuidado.',
      'city.born': 'Nacidos fuera de EE. UU. (ciudad)',
      'city.moe': 'Margen de error',
      'city.residentsLabel': 'Residentes',
      'city.note': 'Las ciudades cruzan los límites de los condados, así que el porcentaje de una ciudad puede diferir del de su condado.',
      'copy.label': 'Copiar enlace a este condado',
      'copy.done': 'Enlace copiado',
      'hint': 'Pasa el cursor, toca o usa la tecla Tab para ver los números de un condado o ciudad.',
      'rank.title': 'Condados con valores más altos: {label}'
    }
  };

  var REGIONS = {
    es: { 'Latin America': 'América Latina', 'Asia': 'Asia', 'Africa': 'África', 'Europe': 'Europa', 'Other': 'Otras regiones' }
  };

  var AREAS = {
    es: { 'Kansas statewide': 'Todo Kansas', 'Kansas City area (8 counties)': 'Área de Kansas City (8 condados)' }
  };

  var COUNTRIES = {
    es: {
      'Mexico': 'México', 'India': 'India', 'Honduras': 'Honduras', 'Guatemala': 'Guatemala', 'China': 'China', 'Vietnam': 'Vietnam',
      'Philippines': 'Filipinas', 'El Salvador': 'El Salvador', 'Ethiopia': 'Etiopía', 'Kenya': 'Kenia', 'Korea': 'Corea',
      'Germany': 'Alemania', 'Nigeria': 'Nigeria', 'Cuba': 'Cuba', 'Colombia': 'Colombia', 'Venezuela': 'Venezuela', 'Nepal': 'Nepal',
      'Somalia': 'Somalia', 'Sudan': 'Sudán', 'Japan': 'Japón', 'Canada': 'Canadá', 'United Kingdom': 'Reino Unido',
      'Ukraine': 'Ucrania', 'Russia': 'Rusia', 'Brazil': 'Brasil', 'Peru': 'Perú', 'Haiti': 'Haití', 'Pakistan': 'Pakistán',
      'Bangladesh': 'Bangladés', 'Thailand': 'Tailandia', 'Laos': 'Laos', 'Iraq': 'Irak', 'Iran': 'Irán', 'Egypt': 'Egipto',
      'Nicaragua': 'Nicaragua', 'Costa Rica': 'Costa Rica', 'Dominican Republic': 'República Dominicana', 'Burma': 'Birmania',
      'Bhutan': 'Bután', 'Ghana': 'Ghana', 'Congo': 'Congo', 'Eritrea': 'Eritrea', 'Liberia': 'Liberia', 'Sierra Leone': 'Sierra Leona',
      'Jamaica': 'Jamaica', 'Ecuador': 'Ecuador', 'Argentina': 'Argentina', 'Chile': 'Chile', 'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
      'Poland': 'Polonia', 'Italy': 'Italia', 'France': 'Francia', 'Spain': 'España', 'Taiwan': 'Taiwán', 'Hong Kong': 'Hong Kong'
    }
  };

  var LANGUAGES = {
    es: {
      'Spanish': 'Español',
      'Other Asian and Pacific Island languages': 'Otros idiomas de Asia y las islas del Pacífico',
      'Other Indo-European languages': 'Otros idiomas indoeuropeos',
      'Chinese (incl. Mandarin, Cantonese)': 'Chino (incl. mandarín y cantonés)',
      'French, Haitian, or Cajun': 'Francés, criollo haitiano o cajún',
      'Vietnamese': 'Vietnamita',
      'Arabic': 'Árabe',
      'Russian, Polish, or other Slavic languages': 'Ruso, polaco u otros idiomas eslavos',
      'German or other West Germanic languages': 'Alemán u otros idiomas germánicos occidentales',
      'Korean': 'Coreano',
      'Tagalog (incl. Filipino)': 'Tagalo (incl. filipino)',
      'Other and unspecified languages': 'Otros idiomas y no especificados'
    }
  };

  var lang = (document.documentElement.lang || 'en').toLowerCase().indexOf('es') === 0 ? 'es' : 'en';

  function lookup(table, name) {
    var map = table[lang];
    return map && map[name] ? map[name] : name;
  }

  window.CD = {
    lang: lang,
    t: function (key, vars) {
      var text = DICT[lang][key] !== undefined ? DICT[lang][key] : DICT.en[key];
      if (text === undefined) return key;
      return text.replace(/\{(\w+)\}/g, function (m, name) { return vars && vars[name] !== undefined ? vars[name] : m; });
    },
    region: function (name) { return lookup(REGIONS, name); },
    area: function (name) { return lookup(AREAS, name); },
    country: function (name) { return lookup(COUNTRIES, name); },
    language: function (name) { return lookup(LANGUAGES, name); }
  };
})();
