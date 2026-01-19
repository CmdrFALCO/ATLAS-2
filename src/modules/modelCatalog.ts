export interface DemoModel {
  id: string;
  label: string;
  file: string;
}

export const MERCEDES_MODELS: DemoModel[] = [
  {
    id: 'eqs-450',
    label: '2023 Mercedes EQS 450',
    file: 'models/2023_mercedes-benz_eqs_450/scene.gltf'
  },
  {
    id: 'hovercar',
    label: 'Merc Hovercar',
    file: 'models/free_merc_hovercar/scene.gltf'
  },
  {
    id: 'gullwing',
    label: 'Mercedes 300 SL Gullwing',
    file: 'models/mercedes-benz_300_sl_gullwing/scene.gltf'
  }
];
