import type { Language, VoiceMode } from '@/types/curriculum';

export interface TutorUtterance {
  display: string;
  speakText: string;
  voiceMode: VoiceMode;
}

export const PRAISE_EN: TutorUtterance[] = [
  { display: '¡Uy, lo estás haciendo súper bien!', speakText: '¡Uy, lo estás haciendo súper bien!', voiceMode: 'es-CO' },
  { display: 'Well done! Qué buen ojo tienes.', speakText: '{en:Well done!} Qué buen ojo tienes.', voiceMode: 'mixed-en' },
  { display: '¡Eso es! Le cogiste el tiro rapidísimo.', speakText: '¡Eso es! Le cogiste el tiro rapidísimo.', voiceMode: 'es-CO' },
  { display: 'Spot on! Así mismito se dice en inglés.', speakText: '{en:Spot on!} Así mismito se dice en inglés.', voiceMode: 'mixed-en' },
  { display: '¡Excelente! Se nota que estás repasando con juicio.', speakText: '¡Excelente! Se nota que estás repasando con juicio.', voiceMode: 'es-CO' },
  { display: 'Nice job! Vas con toda hoy.', speakText: '{en:Nice job!} Vas con toda hoy.', voiceMode: 'mixed-en' },
  { display: '¡Qué nivel! La sacaste limpia a la primera.', speakText: '¡Qué nivel! La sacaste limpia a la primera.', voiceMode: 'es-CO' },
  { display: 'Awesome! Tu oído está cada vez más fino.', speakText: '{en:Awesome!} Tu oído está cada vez más fino.', voiceMode: 'mixed-en' },
  { display: '¡Súper! Esa tenía su truco y no caíste.', speakText: '¡Súper! Esa tenía su truco y no caíste.', voiceMode: 'es-CO' },
  { display: 'You nailed it! Seguimos así.', speakText: '{en:You nailed it!} Seguimos así.', voiceMode: 'mixed-en' },
  { display: '¡Brillante! Me encanta ver cómo avanzas.', speakText: '¡Brillante! Me encanta ver cómo avanzas.', voiceMode: 'es-CO' },
  { display: 'Great! Justo esa era la estructura correcta.', speakText: '{en:Great!} Justo esa era la estructura correcta.', voiceMode: 'mixed-en' },
  { display: '¡Divino! Qué seguridad al responder.', speakText: '¡Divino! Qué seguridad al responder.', voiceMode: 'es-CO' },
  { display: 'Way to go! Ya casi dominas este tema.', speakText: '{en:Way to go!} Ya casi dominas este tema.', voiceMode: 'mixed-en' },
  { display: '¡Qué nota! Vas por muy buen camino.', speakText: '¡Qué nota! Vas por muy buen camino.', voiceMode: 'es-CO' },
  { display: 'Fantastic! Eso suena muy natural.', speakText: '{en:Fantastic!} Eso suena muy natural.', voiceMode: 'mixed-en' },
  { display: '¡Espectacular! Esa regla ya quedó en tu memoria.', speakText: '¡Espectacular! Esa regla ya quedó en tu memoria.', voiceMode: 'es-CO' },
  { display: 'Right on target! Qué precisión.', speakText: '{en:Right on target!} Qué precisión.', voiceMode: 'mixed-en' },
  { display: '¡Oye, qué bien! Ni lo dudaste.', speakText: '¡Oye, qué bien! Ni lo dudaste.', voiceMode: 'es-CO' },
  { display: 'Brilliant! Tu progreso se nota muchísimo.', speakText: '{en:Brilliant!} Tu progreso se nota muchísimo.', voiceMode: 'mixed-en' },
  { display: '¡Fabuloso! Con esa claridad vas a volar en el simulacro.', speakText: '¡Fabuloso! Con esa claridad vas a volar en el simulacro.', voiceMode: 'es-CO' },
  { display: 'Good thinking! Pensaste justo en la clave.', speakText: '{en:Good thinking!} Pensaste justo en la clave.', voiceMode: 'mixed-en' },
  { display: '¡Impecable! Así se construye una buena base.', speakText: '¡Impecable! Así se construye una buena base.', voiceMode: 'es-CO' },
  { display: 'Keep it up! Estás en racha.', speakText: '{en:Keep it up!} Estás en racha.', voiceMode: 'mixed-en' },
  { display: '¡Chévere! Qué respuesta tan limpia.', speakText: '¡Chévere! Qué respuesta tan limpia.', voiceMode: 'es-CO' },
  { display: 'Perfect match! Todo encajó perfecto.', speakText: '{en:Perfect match!} Todo encajó perfecto.', voiceMode: 'mixed-en' },
  { display: '¡Maravilloso! Sigue confiando en tu instinto.', speakText: '¡Maravilloso! Sigue confiando en tu instinto.', voiceMode: 'es-CO' },
  { display: 'Exactly right! Ni una coma fuera de lugar.', speakText: '{en:Exactly right!} Ni una coma fuera de lugar.', voiceMode: 'mixed-en' },
  { display: '¡Qué pila eres! Eso salió fluidísimo.', speakText: '¡Qué pila eres! Eso salió fluidísimo.', voiceMode: 'es-CO' },
  { display: 'Superb! Paso firme y sin afán.', speakText: '{en:Superb!} Paso firme y sin afán.', voiceMode: 'mixed-en' },
  { display: '¡Bárbaro! Ya le tienes medida la lógica.', speakText: '¡Bárbaro! Ya le tienes medida la lógica.', voiceMode: 'es-CO' },
  { display: 'Smart choice! Qué buena deducción.', speakText: '{en:Smart choice!} Qué buena deducción.', voiceMode: 'mixed-en' },
  { display: '¡De diez! Se siente ese dominio.', speakText: '¡De diez! Se siente ese dominio.', voiceMode: 'es-CO' },
  { display: "That's it! Muy bien conectada esa idea.", speakText: "{en:That's it!} Muy bien conectada esa idea.", voiceMode: 'mixed-en' },
  { display: '¡Genial! Estás construyendo un inglés súper sólido.', speakText: '¡Genial! Estás construyendo un inglés súper sólido.', voiceMode: 'es-CO' },
  { display: 'You got it! Vamos por la que sigue.', speakText: '{en:You got it!} Vamos por la que sigue.', voiceMode: 'mixed-en' },
];

export const PRAISE_FR: TutorUtterance[] = [
  { display: '¡Uy, lo estás haciendo súper bien!', speakText: '¡Uy, lo estás haciendo súper bien!', voiceMode: 'es-CO' },
  { display: 'Très bien ! Te quedó impecable.', speakText: '{fr:Très bien!} Te quedó impecable.', voiceMode: 'mixed-fr' },
  { display: '¡Eso es! Le cogiste el tiro rapidísimo.', speakText: '¡Eso es! Le cogiste el tiro rapidísimo.', voiceMode: 'es-CO' },
  { display: 'Magnifique ! Así mismito es en francés.', speakText: '{fr:Magnifique!} Así mismito es en francés.', voiceMode: 'mixed-fr' },
  { display: '¡Excelente! Se nota que estás practicando con juicio.', speakText: '¡Excelente! Se nota que estás practicando con juicio.', voiceMode: 'es-CO' },
  { display: 'Bravo ! Esa tenía su truco y la sacaste limpia.', speakText: '{fr:Bravo!} Esa tenía su truco y la sacaste limpia.', voiceMode: 'mixed-fr' },
  { display: '¡Qué nivel! La agarraste al vuelo.', speakText: '¡Qué nivel! La agarraste al vuelo.', voiceMode: 'es-CO' },
  { display: 'Parfait ! Tu oído para el francés va increíble.', speakText: '{fr:Parfait!} Tu oído para el francés va increíble.', voiceMode: 'mixed-fr' },
  { display: '¡Súper! Qué buen ojo para las terminaciones.', speakText: '¡Súper! Qué buen ojo para las terminaciones.', voiceMode: 'es-CO' },
  { display: "C'est exact ! Seguimos con ese ritmo.", speakText: "{fr:C'est exact!} Seguimos con ese ritmo.", voiceMode: 'mixed-fr' },
  { display: '¡Brillante! Me encanta ver cómo avanzas.', speakText: '¡Brillante! Me encanta ver cómo avanzas.', voiceMode: 'es-CO' },
  { display: 'Génial ! Justo esa era la concordancia.', speakText: '{fr:Génial!} Justo esa era la concordancia.', voiceMode: 'mixed-fr' },
  { display: '¡Divino! Qué seguridad al responder.', speakText: '¡Divino! Qué seguridad al responder.', voiceMode: 'es-CO' },
  { display: 'Formidable ! Ya casi dominas este tema.', speakText: '{fr:Formidable!} Ya casi dominas este tema.', voiceMode: 'mixed-fr' },
  { display: '¡Qué nota! Vas por muy buen camino.', speakText: '¡Qué nota! Vas por muy buen camino.', voiceMode: 'es-CO' },
  { display: 'Chapeau ! Esa salió con mucha elegancia.', speakText: '{fr:Chapeau!} Esa salió con mucha elegancia.', voiceMode: 'mixed-fr' },
  { display: '¡Espectacular! Esa regla ya quedó en tu memoria.', speakText: '¡Espectacular! Esa regla ya quedó en tu memoria.', voiceMode: 'es-CO' },
  { display: 'Bien joué ! Qué buena deducción.', speakText: '{fr:Bien joué!} Qué buena deducción.', voiceMode: 'mixed-fr' },
  { display: '¡Oye, qué bien! Ni lo dudaste.', speakText: '¡Oye, qué bien! Ni lo dudaste.', voiceMode: 'es-CO' },
  { display: 'Superbe ! Tu progreso se nota muchísimo.', speakText: '{fr:Superbe!} Tu progreso se nota muchísimo.', voiceMode: 'mixed-fr' },
  { display: '¡Fabuloso! Con esa calma vas a volar en el simulacro.', speakText: '¡Fabuloso! Con esa calma vas a volar en el simulacro.', voiceMode: 'es-CO' },
  { display: 'Exactement ! Pensaste justo en la clave.', speakText: '{fr:Exactement!} Pensaste justo en la clave.', voiceMode: 'mixed-fr' },
  { display: '¡Impecable! Así se arma una base firme.', speakText: '¡Impecable! Así se arma una base firme.', voiceMode: 'es-CO' },
  { display: 'Continue comme ça ! Estás en racha.', speakText: '{fr:Continue comme ça!} Estás en racha.', voiceMode: 'mixed-fr' },
  { display: '¡Chévere! Qué respuesta tan limpia.', speakText: '¡Chévere! Qué respuesta tan limpia.', voiceMode: 'es-CO' },
  { display: 'Fantastique ! Todo encajó perfecto.', speakText: '{fr:Fantastique!} Todo encajó perfecto.', voiceMode: 'mixed-fr' },
  { display: '¡Maravilloso! Sigue confiando en lo que sabes.', speakText: '¡Maravilloso! Sigue confiando en lo que sabes.', voiceMode: 'es-CO' },
  { display: 'Tout à fait ! Ni una tilde fuera de lugar.', speakText: '{fr:Tout à fait!} Ni una tilde fuera de lugar.', voiceMode: 'mixed-fr' },
  { display: '¡Qué pila eres! Eso salió fluidísimo.', speakText: '¡Qué pila eres! Eso salió fluidísimo.', voiceMode: 'es-CO' },
  { display: 'Excellent ! Paso firme y sin afán.', speakText: '{fr:Excellent!} Paso firme y sin afán.', voiceMode: 'mixed-fr' },
  { display: '¡Bárbaro! Ya le tienes medida la lógica del francés.', speakText: '¡Bárbaro! Ya le tienes medida la lógica del francés.', voiceMode: 'es-CO' },
  { display: 'Bon réflexe ! Muy bien pensado.', speakText: '{fr:Bon réflexe!} Muy bien pensado.', voiceMode: 'mixed-fr' },
  { display: '¡De diez! Se siente ese dominio.', speakText: '¡De diez! Se siente ese dominio.', voiceMode: 'es-CO' },
  { display: 'Voilà ! Muy bien conectada esa frase.', speakText: '{fr:Voilà!} Muy bien conectada esa frase.', voiceMode: 'mixed-fr' },
  { display: '¡Genial! Estás construyendo un francés súper sólido.', speakText: '¡Genial! Estás construyendo un francés súper sólido.', voiceMode: 'es-CO' },
  { display: "C'est ça ! Vamos por la siguiente.", speakText: "{fr:C'est ça!} Vamos por la siguiente.", voiceMode: 'mixed-fr' },
];

export const COACHING_PROMPTS_EN: TutorUtterance[] = [
  { display: 'Mmm, ¿seguro que esto se hace así? Mira la pista que te señalo.', speakText: 'Mmm, ¿seguro que esto se hace así? Mira la pista que te señalo.', voiceMode: 'es-CO' },
  { display: '¡Casi, casi! Pausa un segundito y revisa esta clave.', speakText: '¡Casi, casi! Pausa un segundito y revisa esta clave.', voiceMode: 'es-CO' },
  { display: 'Wait a second, ¿seguro? Dale una segunda mirada aquí.', speakText: '{en:Wait a second,} ¿seguro? Dale una segunda mirada aquí.', voiceMode: 'mixed-en' },
  { display: 'Ojo con esa trampa común. Fíjate justo en lo que te indico.', speakText: 'Ojo con esa trampa común. Fíjate justo en lo que te indico.', voiceMode: 'es-CO' },
  { display: '¡Tranquilo! Inténtalo otra vez mirando esta pequeña guía.', speakText: '¡Tranquilo! Inténtalo otra vez mirando esta pequeña guía.', voiceMode: 'es-CO' },
  { display: 'Think twice! Revisa el sujeto o el tiempo en esta pista.', speakText: '{en:Think twice!} Revisa el sujeto o el tiempo en esta pista.', voiceMode: 'mixed-en' },
  { display: 'Paremos un segundo aquí: ¿seguro que encaja con esa palabra?', speakText: 'Paremos un segundo aquí: ¿seguro que encaja con esa palabra?', voiceMode: 'es-CO' },
  { display: '¡Ya casi la tienes! Mira este detalle que te señalo.', speakText: '¡Ya casi la tienes! Mira este detalle que te señalo.', voiceMode: 'es-CO' },
  { display: 'Hold on! Lee la frase completa de nuevo con esta ayuda.', speakText: '{en:Hold on!} Lee la frase completa de nuevo con esta ayuda.', voiceMode: 'mixed-en' },
  { display: 'No pasa nada, así se aprende. Mira bien esta pista y prueba de nuevo.', speakText: 'No pasa nada, así se aprende. Mira bien esta pista y prueba de nuevo.', voiceMode: 'es-CO' },
  { display: '¿De verdad va esa? Échale un ojito a la pista de abajo.', speakText: '¿De verdad va esa? Échale un ojito a la pista de abajo.', voiceMode: 'es-CO' },
  { display: 'Check this clue! Te doy otra oportunidad para sacarla.', speakText: '{en:Check this clue!} Te doy otra oportunidad para sacarla.', voiceMode: 'mixed-en' },
];

export const COACHING_PROMPTS_FR: TutorUtterance[] = [
  { display: 'Mmm, ¿seguro que esto se hace así? Mira la pista que te señalo.', speakText: 'Mmm, ¿seguro que esto se hace así? Mira la pista que te señalo.', voiceMode: 'es-CO' },
  { display: 'Attends une seconde, ¿seguro? Revisa esta clave.', speakText: '{fr:Attends une seconde,} ¿seguro? Revisa esta clave.', voiceMode: 'mixed-fr' },
  { display: '¡Casi, casi! Pausa un segundito y fíjate en la terminación.', speakText: '¡Casi, casi! Pausa un segundito y fíjate en la terminación.', voiceMode: 'es-CO' },
  { display: 'Ojo con esa trampa típica del francés. Mira justo aquí.', speakText: 'Ojo con esa trampa típica del francés. Mira justo aquí.', voiceMode: 'es-CO' },
  { display: '¡Tranquilo! Inténtalo otra vez mirando esta pequeña guía.', speakText: '¡Tranquilo! Inténtalo otra vez mirando esta pequeña guía.', voiceMode: 'es-CO' },
  { display: 'Regarde bien ! Fíjate en el género o en el sujeto aquí.', speakText: '{fr:Regarde bien!} Fíjate en el género o en el sujeto aquí.', voiceMode: 'mixed-fr' },
  { display: 'Paremos un segundo: ¿seguro que concuerda así?', speakText: 'Paremos un segundo: ¿seguro que concuerda así?', voiceMode: 'es-CO' },
  { display: '¡Ya casi la tienes! Mira este detalle que te señalo.', speakText: '¡Ya casi la tienes! Mira este detalle que te señalo.', voiceMode: 'es-CO' },
  { display: 'Doucement ! Lee la frase otra vez con esta ayudita.', speakText: '{fr:Doucement!} Lee la frase otra vez con esta ayudita.', voiceMode: 'mixed-fr' },
  { display: 'No pasa nada, así se entrena el oído. Mira esta pista y reintenta.', speakText: 'No pasa nada, así se entrena el oído. Mira esta pista y reintenta.', voiceMode: 'es-CO' },
  { display: '¿De verdad va esa? Échale un ojito a la pista que te marco.', speakText: '¿De verdad va esa? Échale un ojito a la pista que te marco.', voiceMode: 'es-CO' },
  { display: 'Attention ici ! Te doy otro intento para sacarla limpia.', speakText: '{fr:Attention ici!} Te doy otro intento para sacarla limpia.', voiceMode: 'mixed-fr' },
];

export const SECOND_CHANCE_WINS: TutorUtterance[] = [
  { display: '¡Ajá! ¡Ahora sí! Qué bien corregido.', speakText: '¡Ajá! ¡Ahora sí! Qué bien corregido.', voiceMode: 'es-CO' },
  { display: '¡Eso! En cuanto viste la pista la sacaste al tiro.', speakText: '¡Eso! En cuanto viste la pista la sacaste al tiro.', voiceMode: 'es-CO' },
  { display: '¿Viste qué fácil era? Así se graba para siempre.', speakText: '¿Viste qué fácil era? Así se graba para siempre.', voiceMode: 'es-CO' },
  { display: '¡Perfecto! Corregir sobre la marcha es la mejor forma de aprender.', speakText: '¡Perfecto! Corregir sobre la marcha es la mejor forma de aprender.', voiceMode: 'es-CO' },
  { display: '¡Muy bien! De esa no te vuelves a olvidar jamás.', speakText: '¡Muy bien! De esa no te vuelves a olvidar jamás.', voiceMode: 'es-CO' },
  { display: '¡Excelente ajuste! Eso demuestra que sí entendiste la lógica.', speakText: '¡Excelente ajuste! Eso demuestra que sí entendiste la lógica.', voiceMode: 'es-CO' },
];

export const WELCOME_PHRASES: Record<Language, TutorUtterance[]> = {
  en: [
    { display: 'Vamos paso a paso, sin afán y con buena energía.', speakText: 'Vamos paso a paso, sin afán y con buena energía.', voiceMode: 'es-CO' },
    { display: 'Si alguna duda se atraviesa, aquí tienes pistas y tutoría.', speakText: 'Si alguna duda se atraviesa, aquí tienes pistas y tutoría.', voiceMode: 'es-CO' },
    { display: "Let's start! Escucha con calma y confía en lo que ya sabes.", speakText: "{en:Let's start!} Escucha con calma y confía en lo que ya sabes.", voiceMode: 'mixed-en' },
    { display: '¡Qué alegría verte por aquí! Hagamos que este tema quede clarísimo.', speakText: '¡Qué alegría verte por aquí! Hagamos que este tema quede clarísimo.', voiceMode: 'es-CO' },
    { display: 'Ready? Vamos a repasar este tema paso a paso.', speakText: '{en:Ready?} Vamos a repasar este tema paso a paso.', voiceMode: 'mixed-en' },
  ],
  fr: [
    { display: 'Vamos paso a paso con el francés, sin afán.', speakText: 'Vamos paso a paso con el francés, sin afán.', voiceMode: 'es-CO' },
    { display: 'Allons-y ! Hoy este tema de francés te va a quedar súper claro.', speakText: '{fr:Allons-y!} Hoy este tema de francés te va a quedar súper claro.', voiceMode: 'mixed-fr' },
    { display: 'Respira hondo, escucha los detalles y sigue cada pista.', speakText: 'Respira hondo, escucha los detalles y sigue cada pista.', voiceMode: 'es-CO' },
    { display: "C'est parti ! Vamos a practicar este tema juntos.", speakText: "{fr:C'est parti!} Vamos a practicar este tema juntos.", voiceMode: 'mixed-fr' },
    { display: '¡Qué bueno tenerte aquí! Paso a paso le cogemos el ritmo al francés.', speakText: '¡Qué bueno tenerte aquí! Paso a paso le cogemos el ritmo al francés.', voiceMode: 'es-CO' },
  ],
};

export const STREAK_MILESTONES: TutorUtterance[] = [
  { display: '¡Tres seguidas! Ya calentaste motores.', speakText: '¡Tres seguidas! Ya calentaste motores.', voiceMode: 'es-CO' },
  { display: '¡Cinco seguidas sin fallo! Estás imparable hoy.', speakText: '¡Cinco seguidas sin fallo! Estás imparable hoy.', voiceMode: 'es-CO' },
  { display: '¡Racha perfecta! Qué orgullo verte responder así.', speakText: '¡Racha perfecta! Qué orgullo verte responder así.', voiceMode: 'es-CO' },
  { display: '¡Guau, siete seguidas! Este tema ya es casi tuyo.', speakText: '¡Guau, siete seguidas! Este tema ya es casi tuyo.', voiceMode: 'es-CO' },
  { display: '¡Impresionante concentración! Sigue con esa energía.', speakText: '¡Impresionante concentración! Sigue con esa energía.', voiceMode: 'es-CO' },
];

export class PhraseDeck<T> {
  private readonly items: T[];
  private bag: T[] = [];
  private lastItem: T | null = null;

  constructor(items: T[]) {
    this.items = [...items];
  }

  next(): T {
    if (this.bag.length === 0) {
      this.bag = [...this.items];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
      if (this.bag.length > 1 && this.bag[this.bag.length - 1] === this.lastItem) {
        [this.bag[0], this.bag[this.bag.length - 1]] = [
          this.bag[this.bag.length - 1],
          this.bag[0],
        ];
      }
    }
    const picked = this.bag.pop()!;
    this.lastItem = picked;
    return picked;
  }
}
