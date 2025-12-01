export enum Genre {
  SCIENTIFIC = 'Científico',
  FUTURISTIC = 'Futurista',
  EDUCATIONAL = 'Educativo',
  MYTHS = 'Mitos e Lendas',
  TALES = 'Contos de Fadas',
  MATH = 'Matemática',
  SCIENCE = 'Ciências Naturais',
  HISTORY = 'História',
  COMIC = 'Quadrinhos/Mangá',
  OTHERS = 'Outros'
}

export enum ImageStyle {
  ANIME = 'Anime/Mangá',
  REALISTIC = 'Realista',
  WATERCOLOR = 'Aquarela',
  SKETCH = 'Esboço Técnico',
  PIXEL_ART = 'Pixel Art',
  FLAT_DESIGN = 'Flat Design (Infográfico)',
  RENDER_3D = 'Render 3D'
}

export interface BookPage {
  id: string;
  pageNumber: number;
  title: string;
  content: string;
  imagePrompt: string;
  generatedImage?: string; // Base64
  layout: 'image-top' | 'image-bottom' | 'image-left' | 'image-right' | 'full-text';
  mascotTip?: string; // The "little anime" helper tip
}

export interface BookProject {
  id: string;
  title: string;
  subtitle: string;
  topic: string;
  genre: Genre;
  imageStyle: ImageStyle;
  totalPages: number;
  pages: BookPage[];
  primaryColor: string; // Hex
  secondaryColor: string; // Hex
  coverImage?: string; // Base64 for the cover
  coverImagePrompt?: string; // Specific prompt for the cover
  visualIdentity: string; // Global visual rules (colors, objects, style)
  createdAt: number;
}

export interface WizardState {
  step: 'topic' | 'settings' | 'generating' | 'editor';
  topic: string;
  uploadedContext: string;
  genre: Genre;
  imageStyle: ImageStyle;
  pageCount: number;
}