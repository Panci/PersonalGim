import { Exercise, EquipmentType, MuscleId } from '../types';

type ExpandedDefinition = {
  id: string;
  name: string;
  primaryMuscle: MuscleId;
  equipment: EquipmentType;
  secondaryMuscles?: MuscleId[];
  instructions: string;
};

const exercise = (definition: ExpandedDefinition): Exercise => ({
  ...definition,
  secondaryMuscles: definition.secondaryMuscles || [],
  isFavorite: false,
  isCustom: false,
});

// Original additions to broaden the in-app library. Names and descriptions are
// written for PersonalGim and are not copied from an external catalogue.
export const EXPANDED_EXERCISES: Exercise[] = [
  // Pecho
  exercise({ id: 'ex-chest-smith-incline', name: 'Press inclinado en multipower', primaryMuscle: 'pectoral', equipment: 'maquina', secondaryMuscles: ['hombros', 'triceps'], instructions: 'Ajusta el banco a 30 grados, baja la barra hacia la parte alta del pecho y empuja manteniendo las escápulas apoyadas.' }),
  exercise({ id: 'ex-chest-converging-machine', name: 'Press convergente de pecho', primaryMuscle: 'pectoral', equipment: 'maquina', secondaryMuscles: ['triceps', 'hombros'], instructions: 'Regula el asiento para que los agarres queden a la altura del esternón y junta las manos sin despegar la espalda.' }),
  exercise({ id: 'ex-chest-cable-fly-mid', name: 'Aperturas en polea a media altura', primaryMuscle: 'pectoral', equipment: 'polea', secondaryMuscles: ['hombros'], instructions: 'Coloca las poleas a la altura del pecho y cierra los brazos describiendo un arco suave, sin doblar más los codos.' }),
  exercise({ id: 'ex-chest-squeeze-press', name: 'Press con mancuernas juntas', primaryMuscle: 'pectoral', equipment: 'mancuerna', secondaryMuscles: ['triceps'], instructions: 'Presiona dos mancuernas una contra otra mientras bajas y subes sobre el centro del pecho.' }),
  exercise({ id: 'ex-chest-pullover', name: 'Pullover con mancuerna', primaryMuscle: 'pectoral', equipment: 'mancuerna', secondaryMuscles: ['dorsales', 'triceps'], instructions: 'Con la espalda apoyada y brazos casi extendidos, lleva la mancuerna detrás de la cabeza y vuelve sobre el pecho.' }),
  exercise({ id: 'ex-chest-wide-pushup', name: 'Flexiones con manos abiertas', primaryMuscle: 'pectoral', equipment: 'peso_corporal', secondaryMuscles: ['hombros', 'triceps'], instructions: 'Coloca las manos algo más abiertas que los hombros, desciende el pecho entre ellas y mantén el cuerpo alineado.' }),

  // Espalda
  exercise({ id: 'ex-back-rack-pull', name: 'Peso muerto desde soportes', primaryMuscle: 'dorsales', equipment: 'barra', secondaryMuscles: ['trapecio', 'lumbares', 'gluteos'], instructions: 'Parte con la barra a media espinilla, fija la espalda y extiende cadera y rodillas manteniendo la barra cerca.' }),
  exercise({ id: 'ex-back-cable-row-single', name: 'Remo unilateral en polea', primaryMuscle: 'dorsales', equipment: 'polea', secondaryMuscles: ['biceps', 'antebrazo'], instructions: 'Tira de un agarre hacia la cadera sin girar el tronco y regresa hasta estirar el dorsal.' }),
  exercise({ id: 'ex-back-chest-supported-row', name: 'Remo con pecho apoyado', primaryMuscle: 'dorsales', equipment: 'mancuerna', secondaryMuscles: ['trapecio', 'biceps'], instructions: 'Apoya el pecho en un banco inclinado y lleva los codos atrás, evitando despegar el torso.' }),
  exercise({ id: 'ex-back-underhand-pulldown', name: 'Jalón supino al pecho', primaryMuscle: 'dorsales', equipment: 'polea', secondaryMuscles: ['biceps'], instructions: 'Usa un agarre supino cómodo y acerca la barra al esternón sin inclinarte hacia atrás.' }),
  exercise({ id: 'ex-back-single-arm-pulldown', name: 'Jalón unilateral de rodillas', primaryMuscle: 'dorsales', equipment: 'polea', secondaryMuscles: ['biceps'], instructions: 'De rodillas frente a la polea, baja un agarre hacia la costilla manteniendo el hombro lejos de la oreja.' }),
  exercise({ id: 'ex-back-machine-pullover', name: 'Pullover en máquina', primaryMuscle: 'dorsales', equipment: 'maquina', secondaryMuscles: ['triceps'], instructions: 'Apoya el pecho y lleva los brazos desde arriba hasta la línea del tronco usando el dorsal, no el impulso.' }),
  exercise({ id: 'ex-back-meadows-row', name: 'Remo Meadows en landmine', primaryMuscle: 'dorsales', equipment: 'barra', secondaryMuscles: ['biceps', 'trapecio'], instructions: 'Colócate de lado a la barra anclada y tira del extremo hacia la cadera manteniendo la columna larga.' }),

  // Hombros
  exercise({ id: 'ex-shoulder-landmine-press', name: 'Press unilateral en landmine', primaryMuscle: 'hombros', equipment: 'barra', secondaryMuscles: ['triceps', 'abdomen'], instructions: 'Empuja el extremo de la barra en diagonal desde el hombro, manteniendo costillas y pelvis apiladas.' }),
  exercise({ id: 'ex-shoulder-leaning-lateral', name: 'Elevación lateral inclinada', primaryMuscle: 'hombros', equipment: 'mancuerna', secondaryMuscles: [], instructions: 'Sujétate a un apoyo e inclina ligeramente el cuerpo para elevar la mancuerna hasta la línea del hombro.' }),
  exercise({ id: 'ex-shoulder-cable-rear-delt', name: 'Apertura posterior cruzada en polea', primaryMuscle: 'hombros', equipment: 'polea', secondaryMuscles: ['trapecio'], instructions: 'Cruza las poleas delante del cuerpo y abre los brazos hasta formar una línea con los hombros.' }),
  exercise({ id: 'ex-shoulder-y-raise', name: 'Elevación Y en banco inclinado', primaryMuscle: 'hombros', equipment: 'mancuerna', secondaryMuscles: ['trapecio'], instructions: 'Con el pecho apoyado, eleva los brazos en forma de Y con pulgares hacia arriba y carga ligera.' }),
  exercise({ id: 'ex-shoulder-cuban-rotation', name: 'Rotación cubana', primaryMuscle: 'hombros', equipment: 'mancuerna', secondaryMuscles: ['trapecio'], instructions: 'Eleva los codos a 90 grados y rota los antebrazos hacia arriba sin perder la posición de los hombros.' }),
  exercise({ id: 'ex-shoulder-plate-front', name: 'Elevación frontal con disco', primaryMuscle: 'hombros', equipment: 'otro', secondaryMuscles: ['pectoral'], instructions: 'Sujeta el disco con ambas manos y eleva hasta la altura de los ojos sin arquear la espalda.' }),

  // Piernas: cuádriceps e isquiotibiales
  exercise({ id: 'ex-legs-belt-squat', name: 'Sentadilla con cinturón', primaryMuscle: 'cuadriceps', equipment: 'maquina', secondaryMuscles: ['gluteos'], instructions: 'Baja entre las piernas manteniendo el torso vertical y empuja con todo el pie para subir.' }),
  exercise({ id: 'ex-legs-single-leg-press', name: 'Prensa unilateral', primaryMuscle: 'cuadriceps', equipment: 'maquina', secondaryMuscles: ['gluteos'], instructions: 'Coloca un pie centrado en la plataforma, desciende hasta un rango cómodo y extiende sin bloquear la rodilla.' }),
  exercise({ id: 'ex-legs-step-up', name: 'Subidas al cajón', primaryMuscle: 'cuadriceps', equipment: 'mancuerna', secondaryMuscles: ['gluteos'], instructions: 'Apoya un pie completo sobre el cajón y sube empujando con esa pierna, sin saltar con la de abajo.' }),
  exercise({ id: 'ex-legs-reverse-lunge', name: 'Zancada atrás', primaryMuscle: 'cuadriceps', equipment: 'mancuerna', secondaryMuscles: ['gluteos', 'isquiotibiales'], instructions: 'Da un paso atrás, baja la rodilla hacia el suelo y vuelve empujando con el pie delantero.' }),
  exercise({ id: 'ex-legs-spanish-squat', name: 'Sentadilla española con banda', primaryMuscle: 'cuadriceps', equipment: 'otro', secondaryMuscles: ['gluteos'], instructions: 'Coloca la banda detrás de las rodillas y siéntate hacia atrás manteniendo las espinillas casi verticales.' }),
  exercise({ id: 'ex-legs-wall-sit', name: 'Sentadilla isométrica en pared', primaryMuscle: 'cuadriceps', equipment: 'peso_corporal', secondaryMuscles: ['gluteos'], instructions: 'Desliza la espalda por la pared hasta quedar con rodillas flexionadas y mantén la posición respirando.' }),
  exercise({ id: 'ex-legs-good-morning', name: 'Buenos días con mancuerna', primaryMuscle: 'isquiotibiales', equipment: 'mancuerna', secondaryMuscles: ['lumbares', 'gluteos'], instructions: 'Apoya la mancuerna en el pecho, lleva la cadera atrás con la espalda neutra y extiende la cadera.' }),
  exercise({ id: 'ex-legs-glute-ham', name: 'Extensión de cadera en glute ham', primaryMuscle: 'isquiotibiales', equipment: 'maquina', secondaryMuscles: ['gluteos', 'lumbares'], instructions: 'Con los pies fijados, baja el torso en bloque y vuelve extendiendo desde la cadera.' }),
  exercise({ id: 'ex-legs-nordic-assisted', name: 'Curl nórdico asistido', primaryMuscle: 'isquiotibiales', equipment: 'peso_corporal', secondaryMuscles: ['gluteos'], instructions: 'Desde rodillas, desciende lentamente y usa las manos para ayudarte a regresar cuando pierdas control.' }),
  exercise({ id: 'ex-legs-seated-good-morning', name: 'Buenos días sentado', primaryMuscle: 'isquiotibiales', equipment: 'barra', secondaryMuscles: ['lumbares'], instructions: 'Sentado con la barra estable, inclina el tronco desde la cadera manteniendo el abdomen activo.' }),
  exercise({ id: 'ex-legs-sissy-assisted', name: 'Sentadilla sissy asistida', primaryMuscle: 'cuadriceps', equipment: 'peso_corporal', secondaryMuscles: ['gluteos'], instructions: 'Agárrate a un soporte, lleva las rodillas hacia delante y desciende controlando la inclinación del cuerpo.' }),

  // Glúteos y cadera
  exercise({ id: 'ex-glute-hip-thrust-machine', name: 'Hip thrust en máquina', primaryMuscle: 'gluteos', equipment: 'maquina', secondaryMuscles: ['isquiotibiales'], instructions: 'Ajusta el apoyo sobre la pelvis y extiende la cadera hasta alinear rodillas, cadera y hombros.' }),
  exercise({ id: 'ex-glute-frog-pump', name: 'Frog pumps', primaryMuscle: 'gluteos', equipment: 'peso_corporal', secondaryMuscles: ['abdomen'], instructions: 'Une las plantas de los pies, abre las rodillas y eleva la pelvis apretando los glúteos.' }),
  exercise({ id: 'ex-glute-single-bridge', name: 'Puente de glúteo unilateral', primaryMuscle: 'gluteos', equipment: 'peso_corporal', secondaryMuscles: ['isquiotibiales'], instructions: 'Mantén una pierna extendida y eleva la cadera sin rotar la pelvis hacia un lado.' }),
  exercise({ id: 'ex-glute-cable-abduction', name: 'Abducción de cadera en polea', primaryMuscle: 'gluteos', equipment: 'polea', secondaryMuscles: ['abductores'], instructions: 'Separa la pierna del cuerpo con la pelvis quieta y regresa despacio contra la tensión del cable.' }),
  exercise({ id: 'ex-glute-sumo-squat', name: 'Sentadilla sumo con mancuerna', primaryMuscle: 'gluteos', equipment: 'mancuerna', secondaryMuscles: ['adductores', 'cuadriceps'], instructions: 'Adopta una postura amplia con puntas abiertas, baja entre las caderas y sube empujando el suelo.' }),
  exercise({ id: 'ex-glute-back-extension', name: 'Extensión de espalda enfocada a glúteo', primaryMuscle: 'gluteos', equipment: 'peso_corporal', secondaryMuscles: ['isquiotibiales', 'lumbares'], instructions: 'Redondea ligeramente la parte alta de la espalda y extiende desde la cadera hasta formar una línea recta.' }),
  exercise({ id: 'ex-glute-curtsy-lunge', name: 'Zancada cruzada', primaryMuscle: 'gluteos', equipment: 'mancuerna', secondaryMuscles: ['cuadriceps', 'abductores'], instructions: 'Lleva una pierna atrás y cruzada, baja con control y vuelve empujando con el talón delantero.' }),

  // Bíceps
  exercise({ id: 'ex-biceps-drag-curl', name: 'Curl drag con barra', primaryMuscle: 'biceps', equipment: 'barra', secondaryMuscles: ['antebrazo'], instructions: 'Desliza los codos hacia atrás mientras subes la barra pegada al torso, sin elevar los hombros.' }),
  exercise({ id: 'ex-biceps-zottman', name: 'Curl Zottman', primaryMuscle: 'biceps', equipment: 'mancuerna', secondaryMuscles: ['antebrazo'], instructions: 'Sube con las palmas arriba, gira a pronación en la parte alta y baja lentamente.' }),
  exercise({ id: 'ex-biceps-reverse-curl', name: 'Curl inverso', primaryMuscle: 'biceps', equipment: 'barra', secondaryMuscles: ['antebrazo'], instructions: 'Usa agarre prono y flexiona los codos sin dejar que las muñecas se doblen hacia atrás.' }),
  exercise({ id: 'ex-biceps-bayesian', name: 'Curl bayesiano en polea', primaryMuscle: 'biceps', equipment: 'polea', secondaryMuscles: ['antebrazo'], instructions: 'De espaldas a la polea baja, mantén el brazo detrás del cuerpo y flexiona el codo sin adelantarlo.' }),
  exercise({ id: 'ex-biceps-double-machine', name: 'Curl doble en máquina', primaryMuscle: 'biceps', equipment: 'maquina', secondaryMuscles: ['antebrazo'], instructions: 'Apoya los brazos en las almohadillas y sube ambos agarres con el mismo ritmo.' }),
  exercise({ id: 'ex-biceps-band', name: 'Curl con banda elástica', primaryMuscle: 'biceps', equipment: 'otro', secondaryMuscles: ['antebrazo'], instructions: 'Pisa la banda, fija los codos junto al torso y sube hasta contraer sin perder tensión.' }),

  // Tríceps
  exercise({ id: 'ex-triceps-jm-press', name: 'Press JM', primaryMuscle: 'triceps', equipment: 'barra', secondaryMuscles: ['pectoral'], instructions: 'Baja la barra hacia la parte alta del pecho flexionando los codos y extiende sin abrirlos.' }),
  exercise({ id: 'ex-triceps-cable-kickback', name: 'Patada de tríceps en polea', primaryMuscle: 'triceps', equipment: 'polea', secondaryMuscles: [], instructions: 'Con el brazo pegado al torso, extiende el codo hacia atrás y aprieta el tríceps al final.' }),
  exercise({ id: 'ex-triceps-crossbody', name: 'Extensión cruzada en polea', primaryMuscle: 'triceps', equipment: 'polea', secondaryMuscles: [], instructions: 'Lleva el agarre desde el hombro contrario hacia la cadera extendiendo el codo.' }),
  exercise({ id: 'ex-triceps-tate-press', name: 'Tate press', primaryMuscle: 'triceps', equipment: 'mancuerna', secondaryMuscles: ['pectoral'], instructions: 'Tumbado, junta las mancuernas sobre el pecho y flexiona los codos hacia fuera antes de volver.' }),
  exercise({ id: 'ex-triceps-floor-press', name: 'Press de suelo agarre cerrado', primaryMuscle: 'triceps', equipment: 'barra', secondaryMuscles: ['pectoral'], instructions: 'Tumbado en el suelo con agarre estrecho, toca suavemente con los tríceps y empuja la barra.' }),
  exercise({ id: 'ex-triceps-bodyweight-extension', name: 'Extensión de tríceps en banco', primaryMuscle: 'triceps', equipment: 'peso_corporal', secondaryMuscles: ['hombros'], instructions: 'Apoya las manos en el banco, flexiona los codos llevando el pecho hacia el borde y extiende.' }),

  // Antebrazo y agarre
  exercise({ id: 'ex-forearm-reverse-wrist', name: 'Curl de muñeca invertido', primaryMuscle: 'antebrazo', equipment: 'barra', secondaryMuscles: [], instructions: 'Apoya los antebrazos y extiende las muñecas hacia arriba con un recorrido corto y controlado.' }),
  exercise({ id: 'ex-forearm-plate-pinch', name: 'Pinza de discos', primaryMuscle: 'antebrazo', equipment: 'otro', secondaryMuscles: [], instructions: 'Sujeta dos discos lisos con los dedos y mantén el agarre el tiempo indicado sin encoger el hombro.' }),
  exercise({ id: 'ex-forearm-wrist-roller', name: 'Rodillo de muñeca', primaryMuscle: 'antebrazo', equipment: 'otro', secondaryMuscles: ['biceps'], instructions: 'Gira la barra con ambas muñecas para enrollar y desenrollar la carga sin mover los codos.' }),
  exercise({ id: 'ex-forearm-pronation', name: 'Pronación y supinación en polea', primaryMuscle: 'antebrazo', equipment: 'polea', secondaryMuscles: [], instructions: 'Rota el antebrazo desde una posición estable, manteniendo el codo apoyado y la carga ligera.' }),

  // Abdomen y core
  exercise({ id: 'ex-abs-dead-bug', name: 'Dead bug', primaryMuscle: 'abdomen', equipment: 'peso_corporal', secondaryMuscles: [], instructions: 'Tumbado boca arriba, alterna brazo y pierna contrarios sin despegar la zona lumbar del suelo.' }),
  exercise({ id: 'ex-abs-hollow-hold', name: 'Hollow body hold', primaryMuscle: 'abdomen', equipment: 'peso_corporal', secondaryMuscles: [], instructions: 'Eleva hombros y piernas con la espalda baja pegada al suelo y mantén una respiración corta y controlada.' }),
  exercise({ id: 'ex-abs-mountain-climber', name: 'Escaladores de montaña', primaryMuscle: 'abdomen', equipment: 'peso_corporal', secondaryMuscles: ['hombros'], instructions: 'En plancha, acerca las rodillas al pecho de forma alterna sin rebotar ni elevar demasiado la cadera.' }),
  exercise({ id: 'ex-abs-pallof-press', name: 'Press Pallof', primaryMuscle: 'oblicuos', equipment: 'polea', secondaryMuscles: ['abdomen'], instructions: 'De lado a la polea, lleva el agarre al frente y resiste la rotación manteniendo pelvis y costillas quietas.' }),
  exercise({ id: 'ex-abs-reverse-crunch', name: 'Crunch inverso', primaryMuscle: 'abdomen', equipment: 'peso_corporal', secondaryMuscles: ['oblicuos'], instructions: 'Eleva la pelvis hacia las costillas sin balancear las piernas y desciende lentamente.' }),
  exercise({ id: 'ex-abs-side-plank', name: 'Plancha lateral', primaryMuscle: 'oblicuos', equipment: 'peso_corporal', secondaryMuscles: ['hombros'], instructions: 'Apóyate sobre un antebrazo, alinea hombros y tobillos y mantén la cadera elevada.' }),
  exercise({ id: 'ex-abs-toe-touch', name: 'Toques de puntas', primaryMuscle: 'abdomen', equipment: 'peso_corporal', secondaryMuscles: [], instructions: 'Con las piernas elevadas, acerca las manos a las puntas de los pies sin tirar del cuello.' }),
  exercise({ id: 'ex-abs-windshield-wiper', name: 'Limpiaparabrisas colgado', primaryMuscle: 'oblicuos', equipment: 'peso_corporal', secondaryMuscles: ['dorsales'], instructions: 'Colgado con el core activo, mueve las piernas juntas de un lado al otro con un rango que puedas frenar.' }),
];
