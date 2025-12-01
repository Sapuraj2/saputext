import { GoogleGenAI, Type } from "@google/genai";
import { BookProject, Genre, ImageStyle, BookPage } from "../types";

// Helper to get client
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found in environment");
  return new GoogleGenAI({ apiKey });
};

export const generateBookStructure = async (
  topic: string,
  context: string,
  genre: Genre,
  imageStyle: ImageStyle,
  pageCount: number
): Promise<Partial<BookProject>> => {
  const ai = getClient();
  
  const systemInstruction = `
    Você é o SapuText, um especialista técnico e autor de manuais práticos ilustrados.
    Sua missão é criar um guia "PASSO A PASSO" extremamente funcional e direto sobre o tema: ${topic}.
    
    Diretrizes Críticas:
    1. OBJETIVO: O livro deve ensinar a fazer, montar ou entender algo na prática. Resultados reais.
    2. ESTRUTURA: Exatamente ${pageCount} páginas. Sequência lógica: Início -> Meio (Processo) -> Fim (Resultado).
    3. TEXTO (content): Informação exata, técnica mas acessível. Divida em parágrafos claros.
    4. DICAS (mascotTip): Devem ser alertas de segurança, detalhes cruciais ou "pulos do gato". Curto e grosso (negrito implícito).
    5. IDENTIDADE VISUAL (visualIdentity): Defina UMA REGRA ÚNICA que descreva as cores e aparência dos objetos principais para manter consistência (ex: "O motor é sempre cinza com fios vermelhos").
    6. IMAGEM (imagePrompt):
       - O prompt DEVE descrever EXATAMENTE o que está no texto.
       - Use "SETAS INDICATIVAS", "ZOOM", "VISTA EXPLODIDA", "CONEXÃO EM DETALHE".
       - Ex: "Seta vermelha mostra o parafuso entrando no buraco X".
       - Estilo: Fundo branco, limpo, alta visibilidade.

    Use o contexto fornecido como base absoluta para os dados técnicos se houver.
  `;

  const prompt = `
    Tema Prático: ${topic}.
    Material de Base: ${context || "N/A"}.
    
    Gere o JSON com a estrutura do manual passo a passo, a identidade visual global e o prompt da capa.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            visualIdentity: { type: Type.STRING, description: "Descrição detalhada dos objetos e cores recorrentes para consistência." },
            coverImagePrompt: { type: Type.STRING, description: "Prompt visual para a imagem da capa, focado no tema geral." },
            pages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING },
                  mascotTip: { type: Type.STRING },
                  layout: { type: Type.STRING, enum: ['image-top', 'image-bottom', 'image-left', 'image-right', 'full-text'] }
                },
                required: ['title', 'content', 'imagePrompt', 'layout', 'mascotTip']
              }
            }
          },
          required: ['title', 'subtitle', 'visualIdentity', 'coverImagePrompt', 'pages']
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    
    // Hydrate with IDs and defaults
    const pages: BookPage[] = (data.pages || []).map((p: any, index: number) => ({
      ...p,
      id: crypto.randomUUID(),
      pageNumber: index + 1,
      generatedImage: undefined
    }));

    return {
      title: data.title || topic,
      subtitle: data.subtitle || "Manual Prático SapuText",
      visualIdentity: data.visualIdentity || `Estilo consistente para ${topic}, fundo branco e limpo.`,
      coverImagePrompt: data.coverImagePrompt || `Uma ilustração técnica e artística sobre ${topic}, alta qualidade`,
      pages: pages
    };

  } catch (error) {
    console.error("Error generating book structure:", error);
    throw error;
  }
};

export const generateImageForPage = async (prompt: string, contextText: string, visualIdentity: string): Promise<string> => {
  const ai = getClient();
  
  try {
    // We construct a prompt that forces the model to look at the context content AND visual identity.
    const fullPrompt = `
      IDENTIDADE VISUAL GLOBAL (OBRIGATÓRIO SEGUIR): "${visualIdentity}"
      
      CONTEXTO DA PÁGINA (O QUE ESTÁ ACONTECENDO): "${contextText}"
      
      INSTRUÇÃO DE DESENHO (PROMPT): "${prompt}"
      
      REQUISITOS TÉCNICOS:
      1. Mantenha as cores e formas descritas na IDENTIDADE VISUAL.
      2. Use ELEMENTOS GRÁFICOS como SETAS, LINHAS PONTILHADAS e CIRCULOS DE DESTAQUE para explicar a ação.
      3. Se o texto menciona conectar A em B, mostre EXATAMENTE essa conexão.
      4. Fundo branco sólido ou neutro (estilo estúdio/manual técnico).
      5. Alta resolução, traço limpo, fácil compreensão.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: fullPrompt }]
      },
      config: {
        // Nano banana models do not support responseMimeType or specific aspect ratio config in the same way as Pro
        // But we rely on the prompt for ratio guidance if needed, or default behavior.
      }
    });

    let imageUrl = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) throw new Error("No image generated");
    return imageUrl;

  } catch (error) {
    console.error("Error generating image:", error);
    // Fallback or re-throw depending on UX needs. 
    // Here we return a placeholder error image or empty string to be handled by UI.
    throw error;
  }
};

export const refineText = async (currentText: string, instruction: string): Promise<string> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Texto técnico original: "${currentText}".\nInstrução: ${instruction}.\nMantenha a formatação didática. Retorne apenas o novo texto.`,
  });
  return response.text || currentText;
}