import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export const exportCsvFile = async (content: string, filename: string): Promise<string> => {
  const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!directory) {
    throw new Error('No hay almacenamiento disponible para crear el CSV.');
  }

  const uri = `${directory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: 'utf8' });

  if (!(await Sharing.isAvailableAsync())) {
    return `CSV creado temporalmente, pero Compartir no está disponible: ${filename}`;
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Exportar informe CSV',
  });
  return `CSV preparado para compartir: ${filename}`;
};
