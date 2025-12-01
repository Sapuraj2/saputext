import React, { useState, useRef, useEffect } from 'react';
import { BookProject, BookPage } from '../types';
import { generateImageForPage, refineText } from '../services/geminiService';
import { MOCK_MASCOT_IMAGE } from '../constants';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PptxGenJS from "pptxgenjs";

interface BookEditorProps {
  project: BookProject;
  onUpdateProject: (p: BookProject) => void;
  onBack: () => void;
}

export const BookEditor: React.FC<BookEditorProps> = ({ project, onUpdateProject, onBack }) => {
  // -1 indicates Cover Editor, 0+ indicates Pages
  const [activePageIndex, setActivePageIndex] = useState<number>(-1);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [isRefiningText, setIsRefiningText] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false);
  
  // State for tip importance level (local UI state, could be persisted if added to types)
  const [tipImportance, setTipImportance] = useState<'info' | 'warning' | 'critical'>('info');
  
  const bookRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive active page or use dummy for cover
  const activePage: BookPage | undefined = activePageIndex >= 0 ? project.pages[activePageIndex] : undefined;

  // Auto-resize textarea logic
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [activePage?.content]);

  const handleUpdatePage = (key: keyof BookPage, value: any) => {
    if (activePageIndex === -1) return; // Cover doesn't use this
    const updatedPages = [...project.pages];
    updatedPages[activePageIndex] = { ...updatedPages[activePageIndex], [key]: value };
    onUpdateProject({ ...project, pages: updatedPages });
  };

  const handleUpdateProject = (key: keyof BookProject, value: any) => {
    onUpdateProject({ ...project, [key]: value });
  };

  const generateImage = async () => {
    setIsGeneratingImage(true);
    try {
      if (activePageIndex === -1) {
        // Generate Cover Image
        // Use Title + Subtitle as context for the cover
        const context = `LIVRO: ${project.title}. SUBTÍTULO: ${project.subtitle}. TEMA: ${project.topic}.`;
        const imageUrl = await generateImageForPage(project.coverImagePrompt || "Capa do livro", context, project.visualIdentity);
        onUpdateProject({ ...project, coverImage: imageUrl });
      } else if (activePage) {
        // Generate Page Image
        // CRITICAL: Pass content as context AND visualIdentity
        const imageUrl = await generateImageForPage(activePage.imagePrompt, activePage.content, project.visualIdentity);
        const updatedPages = project.pages.map(p => 
          p.id === activePage.id ? { ...p, generatedImage: imageUrl } : p
        );
        onUpdateProject({ ...project, pages: updatedPages });
      }
    } catch (e) {
      alert("Falha ao gerar imagem. Verifique se sua chave API é válida.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        if (activePageIndex === -1) {
          onUpdateProject({ ...project, coverImage: imageUrl });
        } else {
          handleUpdatePage('generatedImage', imageUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRefineText = async (instruction: string) => {
    if (activePageIndex === -1 || !activePage) return;
    setIsRefiningText(true);
    try {
      const newText = await refineText(activePage.content, instruction);
      handleUpdatePage('content', newText);
    } finally {
      setIsRefiningText(false);
    }
  };

  const exportPDF = async () => {
    if (!bookRef.current) return;
    setIsExporting(true);
    
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.width = '1123px'; // A4 landscape width @ 96dpi
    document.body.appendChild(container);

    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();
      
      // Render Cover
      // Use coverImage as background with blur/overlay if present
      const coverBgStyle = project.coverImage 
        ? `background-image: url('${project.coverImage}'); background-size: cover; background-position: center;` 
        : `background-color: ${project.secondaryColor};`;

      container.innerHTML = `
        <div style="width: 1123px; height: 794px; ${coverBgStyle} display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; font-family: sans-serif; position: relative; overflow: hidden;">
          ${project.coverImage ? `<div style="position: absolute; inset: 0; background: rgba(255,255,255,0.7); backdrop-filter: blur(10px);"></div>` : ''}
          <div style="position: relative; z-index: 10; padding: 60px;">
            <h1 style="font-size: 72px; color: ${project.primaryColor}; font-weight: bold; margin-bottom: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">${project.title}</h1>
            <h2 style="font-size: 36px; color: #333; margin-bottom: 40px;">${project.subtitle}</h2>
            <div style="font-size: 24px; color: #555; font-weight: bold; background: ${project.primaryColor}22; padding: 10px 30px; border-radius: 50px; display: inline-block;">
              Manual Prático SapuText
            </div>
          </div>
        </div>
      `;
      const coverCanvas = await html2canvas(container.firstElementChild as HTMLElement, { scale: 1, useCORS: true });
      doc.addImage(coverCanvas.toDataURL('image/jpeg', 0.8), 'JPEG', 0, 0, width, height);

      // Render Pages
      for (const page of project.pages) {
        doc.addPage();
        container.innerHTML = `
           <div style="width: 1123px; height: 794px; padding: 40px; background-color: white; display: flex; box-sizing: border-box; font-family: sans-serif;">
             <div style="flex: 1; padding: 20px; display: flex; flex-direction: column; justify-content: flex-start;">
                <div style="margin-bottom: 20px; color: #888; font-size: 14px; text-transform: uppercase; font-weight: bold;">Passo ${page.pageNumber}</div>
                <h3 style="font-size: 32px; color: ${project.primaryColor}; margin-bottom: 20px;">${page.title}</h3>
                <p style="font-size: 20px; line-height: 1.6; color: #333; white-space: pre-wrap;">${page.content}</p>
                ${page.mascotTip ? `
                  <div style="margin-top: auto; background: #f0fdf4; padding: 20px; border-radius: 15px; border: 2px solid #bbf7d0; display: flex; align-items: start;">
                    <img src="${MOCK_MASCOT_IMAGE}" style="width: 60px; height: 60px; margin-right: 20px;" />
                    <div>
                      <div style="font-weight: bold; color: #166534; font-size: 14px; text-transform: uppercase; margin-bottom: 5px;">Nota do Especialista</div>
                      <span style="font-style: italic; color: #14532d; font-size: 18px;">${page.mascotTip}</span>
                    </div>
                  </div>
                ` : ''}
             </div>
             <div style="flex: 1; padding: 20px; display: flex; align-items: center; justify-content: center;">
                ${page.generatedImage ? `<img src="${page.generatedImage}" style="max-width: 100%; max-height: 100%; border-radius: 8px; border: 2px solid #eee;" />` : `<div style="width: 100%; height: 300px; background: #eee; display: flex; align-items: center; justify-content: center; color: #aaa;">Sem Imagem</div>`}
             </div>
           </div>
        `;
        const canvas = await html2canvas(container.firstElementChild as HTMLElement, { scale: 1, useCORS: true });
        doc.addImage(canvas.toDataURL('image/jpeg', 0.8), 'JPEG', 0, 0, width, height);
      }
      
      doc.save(`${project.title.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Erro ao exportar PDF.");
    } finally {
      document.body.removeChild(container);
      setIsExporting(false);
    }
  };

  const exportWord = () => {
    try {
      let htmlBody = `
        <div style="text-align: center; padding: 50px;">
          <h1 style="color:${project.primaryColor}; font-size: 36pt;">${project.title}</h1>
          <h2 style="font-size: 24pt;">${project.subtitle}</h2>
          ${project.coverImage ? `<img src="${project.coverImage}" width="400" />` : ''}
        </div>
        <br style="page-break-after: always;" />
      `;

      project.pages.forEach((page, i) => {
        htmlBody += `
          <div style="page-break-after: always; padding: 20px;">
            <p style="color: #666; font-size: 10pt;">PASSO ${i+1}</p>
            <h3 style="color:${project.primaryColor}">${page.title}</h3>
            <p style="font-size: 12pt;">${page.content}</p>
            ${page.mascotTip ? `<p style="background-color: #f0fdf4; padding: 10px; border: 1px solid #bbf7d0;"><strong>Dica Técnica:</strong> ${page.mascotTip}</p>` : ''}
            ${page.generatedImage ? `<img src="${page.generatedImage}" width="500" style="margin-top: 20px; border: 1px solid #ddd;" />` : ''}
          </div>
        `;
      });

      const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${project.title}</title></head><body>`;
      const footer = "</body></html>";
      const sourceHTML = header + htmlBody + footer;

      const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title}.doc`;
      a.click();
    } catch (e) {
      alert("Erro ao exportar Word.");
    }
  };

  const exportPPT = async () => {
    setIsExporting(true);
    try {
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';

      // Cover Slide
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };
      
      // If we have a cover image, add it as background or image
      if (project.coverImage) {
        slide.addImage({ data: project.coverImage, x: 0, y: 0, w: '100%', h: '100%' });
        // Add a semi-transparent box for text legibility
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 2, w: '100%', h: 3, fill: { color: 'FFFFFF', transparency: 30 } });
      } else {
        slide.background = { color: project.secondaryColor.replace('#', '') };
      }

      slide.addText(project.title, { x: 0.5, y: 2.2, w: '90%', h: 1.5, fontSize: 44, bold: true, color: project.primaryColor.replace('#', ''), align: 'center' });
      slide.addText(project.subtitle, { x: 0.5, y: 3.8, w: '90%', h: 1, fontSize: 24, color: '333333', align: 'center' });

      // Pages
      project.pages.forEach(page => {
        const s = pptx.addSlide();
        s.addText(`PASSO ${page.pageNumber}`, { x: 0.5, y: 0.2, fontSize: 12, color: '888888' });
        s.addText(page.title, { x: 0.5, y: 0.5, w: '90%', h: 0.8, fontSize: 32, color: project.primaryColor.replace('#', ''), bold: true });
        
        // Content
        s.addText(page.content, { x: 0.5, y: 1.5, w: 4.5, h: 4, fontSize: 18, color: '333333', valign: 'top' });
        
        // Mascot Tip
        if(page.mascotTip) {
          s.addText(`Dica: ${page.mascotTip}`, { 
            x: 0.5, y: 5.8, w: 4.5, h: 1, 
            fontSize: 14, color: '166534', fill: { color: 'dcfce7' }, shape: pptx.ShapeType.roundRect 
          });
        }

        // Image
        if (page.generatedImage) {
          s.addImage({ data: page.generatedImage, x: 5.2, y: 1.5, w: 4.5, h: 4.5 });
        }
      });

      await pptx.writeFile({ fileName: `${project.title}.pptx` });

    } catch (e) {
      console.error(e);
      alert("Erro ao gerar PowerPoint.");
    } finally {
      setIsExporting(false);
    }
  };

  const saveProject = () => {
    const json = JSON.stringify(project);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saputext_manual_${project.title.substring(0,10)}.json`;
    a.click();
  };

  // COVER EDITOR RENDER
  if (activePageIndex === -1) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-100">
        <aside className="w-72 bg-white border-r border-gray-200 flex flex-col z-20 no-print shadow-lg">
          <div className="p-6 border-b border-gray-100 bg-sapu-50">
            <button onClick={onBack} className="flex items-center text-sapu-700 hover:text-sapu-900 mb-4 font-bold text-sm transition">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              VOLTAR
            </button>
            <h1 className="font-extrabold text-sapu-800 text-xl truncate leading-tight" title={project.title}>{project.title}</h1>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
             <button
              onClick={() => setActivePageIndex(-1)}
              className="w-full text-left p-4 rounded-xl text-sm flex items-center transition-all duration-200 border bg-sapu-50 border-sapu-300 shadow-md transform scale-[1.02]"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0 bg-sapu-600 text-white shadow-sm">
                C
              </div>
              <div className="flex-1 min-w-0">
                 <p className="truncate font-bold text-sapu-900">CAPA DO LIVRO</p>
                 <p className="truncate text-xs text-gray-400 mt-0.5">Título e Identidade Visual</p>
              </div>
            </button>
            <div className="h-px bg-gray-200 my-2"></div>
            {project.pages.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setActivePageIndex(idx)}
                className="w-full text-left p-4 rounded-xl text-sm flex items-center transition-all duration-200 border bg-white border-transparent hover:bg-gray-50 text-gray-600"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0 bg-gray-200 text-gray-500">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                   <p className="truncate font-bold text-gray-700">{p.title}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-gray-100 relative flex flex-col items-center">
           <div className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm">
             <h2 className="text-xl font-bold text-gray-800">Editor de Capa</h2>
             <button onClick={saveProject} className="text-sm text-sapu-600 font-bold hover:underline">Salvar Projeto</button>
           </div>
           
           <div className="w-full max-w-5xl my-8 px-4 pb-20">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                 {/* Visual Preview */}
                 <div className="flex-1 relative bg-gray-200 flex flex-col items-center justify-center overflow-hidden">
                    {project.coverImage && (
                      <div className="absolute inset-0 z-0">
                        <img src={project.coverImage} className="w-full h-full object-cover opacity-100" />
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm"></div>
                      </div>
                    )}
                    <div className="relative z-10 text-center p-12 max-w-2xl">
                       <input 
                         value={project.title}
                         onChange={(e) => handleUpdateProject('title', e.target.value)}
                         className="text-5xl md:text-7xl font-extrabold text-center bg-transparent border-none focus:ring-0 outline-none w-full mb-4"
                         style={{ color: project.primaryColor, textShadow: '0 2px 10px rgba(255,255,255,0.8)' }}
                       />
                       <input 
                         value={project.subtitle}
                         onChange={(e) => handleUpdateProject('subtitle', e.target.value)}
                         className="text-2xl md:text-3xl font-medium text-center bg-transparent border-none focus:ring-0 outline-none w-full text-gray-800"
                         style={{ textShadow: '0 1px 5px rgba(255,255,255,0.8)' }}
                       />
                       <div className="mt-8 inline-block px-6 py-2 bg-sapu-600 text-white rounded-full text-sm font-bold shadow-lg">
                         Manual SapuText
                       </div>
                    </div>
                 </div>

                 {/* Controls */}
                 <div className="w-full md:w-96 bg-white border-l border-gray-200 p-8 flex flex-col gap-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Prompt da Capa</label>
                      <textarea 
                        className="w-full h-32 p-3 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-sapu-200 outline-none resize-none"
                        value={project.coverImagePrompt || ""}
                        onChange={(e) => handleUpdateProject('coverImagePrompt', e.target.value)}
                        placeholder="Descreva a imagem de fundo da capa..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 text-sapu-600">Identidade Visual (Global)</label>
                      <textarea 
                        className="w-full h-24 p-3 rounded-lg border border-sapu-200 bg-sapu-50 text-sm focus:ring-2 focus:ring-sapu-200 outline-none resize-none"
                        value={project.visualIdentity || ""}
                        onChange={(e) => handleUpdateProject('visualIdentity', e.target.value)}
                        placeholder="Ex: Todas as imagens têm estilo anime, o robô principal é azul, fundo sempre branco..."
                      />
                      <p className="text-[10px] text-gray-400 mt-1">Isso será aplicado a todas as imagens geradas.</p>
                    </div>
                    
                    <button 
                      onClick={generateImage}
                      disabled={isGeneratingImage}
                      className="w-full py-4 bg-sapu-600 text-white font-bold rounded-xl hover:bg-sapu-700 transition shadow-lg flex items-center justify-center gap-2"
                    >
                      {isGeneratingImage ? <span className="animate-spin">⌛</span> : <span>🎨 Gerar Capa</span>}
                    </button>
                    
                     <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition cursor-pointer">
                        <p className="text-sm text-gray-500 font-medium">Ou carregue sua imagem</p>
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleUploadImage} />
                     </div>

                    <div className="mt-auto border-t pt-6">
                       <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Cor Principal</label>
                       <div className="flex gap-2">
                          <input 
                            type="color" 
                            value={project.primaryColor}
                            onChange={(e) => handleUpdateProject('primaryColor', e.target.value)}
                            className="w-full h-10 rounded cursor-pointer"
                          />
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </main>
      </div>
    );
  }

  // PAGE EDITOR RENDER
  if (!activePage) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col z-20 no-print shadow-lg">
        <div className="p-6 border-b border-gray-100 bg-sapu-50">
          <button onClick={onBack} className="flex items-center text-sapu-700 hover:text-sapu-900 mb-4 font-bold text-sm transition">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            VOLTAR
          </button>
          <h1 className="font-extrabold text-sapu-800 text-xl truncate leading-tight" title={project.title}>{project.title}</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <button
              onClick={() => setActivePageIndex(-1)}
              className="w-full text-left p-4 rounded-xl text-sm flex items-center transition-all duration-200 border bg-white border-transparent hover:bg-gray-50 text-gray-600"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0 bg-gray-200 text-gray-500">
                C
              </div>
              <div className="flex-1 min-w-0">
                 <p className="truncate font-bold text-gray-700">CAPA</p>
              </div>
            </button>
            <div className="h-px bg-gray-200 my-2"></div>

          {project.pages.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => setActivePageIndex(idx)}
              className={`w-full text-left p-4 rounded-xl text-sm flex items-center transition-all duration-200 border ${idx === activePageIndex ? 'bg-sapu-50 border-sapu-300 shadow-md transform scale-[1.02]' : 'bg-white border-transparent hover:bg-gray-50 text-gray-600'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0 ${idx === activePageIndex ? 'bg-sapu-500 text-white shadow-sm' : 'bg-gray-200 text-gray-500'}`}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                 <p className={`truncate font-bold ${idx === activePageIndex ? 'text-sapu-900' : 'text-gray-700'}`}>{p.title}</p>
                 <p className="truncate text-xs text-gray-400 mt-0.5">{p.content.substring(0, 25)}...</p>
              </div>
            </button>
          ))}
          <button onClick={() => {
            const newPage: BookPage = {
              id: crypto.randomUUID(),
              pageNumber: project.pages.length + 1,
              title: "Novo Passo",
              content: "Descreva a próxima etapa do processo...",
              imagePrompt: "Esquema técnico desta etapa...",
              layout: "image-top",
              mascotTip: "Dica de segurança ou montagem..."
            };
            onUpdateProject({ ...project, pages: [...project.pages, newPage] });
            setActivePageIndex(project.pages.length);
          }} className="w-full py-3 border-2 border-dashed border-sapu-300 text-sapu-600 rounded-xl hover:bg-sapu-50 text-sm mt-4 font-bold transition flex items-center justify-center gap-2">
            <span>+</span> ADICIONAR PÁGINA
          </button>
        </div>

        <div className="p-4 border-t border-gray-100 bg-white space-y-2 z-30">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Salvar & Exportar</p>
           <button onClick={saveProject} className="w-full py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 text-sm flex items-center justify-center gap-2 transition font-medium">
             <span>💾</span> Salvar Projeto
           </button>
           <div className="grid grid-cols-2 gap-2">
             <button onClick={exportWord} className="w-full py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 text-sm flex items-center justify-center transition font-bold" title="Word">
                DOCX
             </button>
             <button onClick={exportPPT} disabled={isExporting} className="w-full py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 text-sm flex items-center justify-center transition font-bold" title="PowerPoint">
                {isExporting ? '...' : 'PPTX'}
             </button>
           </div>
           <button onClick={exportPDF} disabled={isExporting} className="w-full py-3 bg-gradient-to-r from-sapu-600 to-sapu-500 text-white rounded-lg hover:from-sapu-700 hover:to-sapu-600 text-sm shadow-md flex justify-center items-center gap-2 font-bold transition transform hover:translate-y-px">
             {isExporting ? <span className="animate-spin">⌛</span> : <span>📄 EXPORTAR PDF</span>}
           </button>
        </div>
      </aside>

      {/* Main Content Area - EXPANDED */}
      <main className="flex-1 overflow-y-auto bg-gray-100 relative flex flex-col items-center">
        
        {/* Toolbar */}
        <div className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm">
          <div className="flex gap-6 items-center">
             <div className="flex items-center gap-3">
                <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Cores</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={project.primaryColor}
                    onChange={(e) => handleUpdateProject('primaryColor', e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-2 border-white shadow-sm ring-1 ring-gray-200"
                    title="Cor do Título"
                  />
                  <input 
                    type="color" 
                    value={project.secondaryColor}
                    onChange={(e) => handleUpdateProject('secondaryColor', e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-2 border-white shadow-sm ring-1 ring-gray-200"
                    title="Cor de Fundo"
                  />
                </div>
             </div>
             <div className="h-8 w-px bg-gray-200"></div>
             <div className="flex gap-2">
                <button onClick={() => setShowIdentity(!showIdentity)} className="px-4 py-2 text-xs bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 border border-indigo-200 font-bold transition flex items-center gap-2">
                   👁️ ID VISUAL
                </button>
                <button onClick={() => handleRefineText("Tornar mais técnico e direto")} disabled={isRefiningText} className="px-4 py-2 text-xs bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 border border-gray-200 font-bold transition flex items-center gap-2">
                  {isRefiningText ? '...' : '🛠️ TÉCNICO'}
                </button>
             </div>
          </div>
          
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Editando Passo {activePage.pageNumber} de {project.pages.length}
          </div>
        </div>

        {/* Visual Identity Dropdown Panel */}
        {showIdentity && (
          <div className="w-full max-w-[95%] xl:max-w-[1800px] mt-4 px-4">
             <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex gap-4 items-start shadow-sm">
                <div className="flex-1">
                   <h4 className="text-sm font-bold text-indigo-800 mb-1">Identidade Visual Global (Afeta todas as imagens)</h4>
                   <textarea 
                      className="w-full bg-white border border-indigo-200 rounded-lg p-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-300"
                      rows={2}
                      value={project.visualIdentity}
                      onChange={(e) => handleUpdateProject('visualIdentity', e.target.value)}
                   />
                </div>
                <button onClick={() => setShowIdentity(false)} className="text-indigo-400 hover:text-indigo-600 font-bold">✕</button>
             </div>
          </div>
        )}

        {/* Big Canvas Container */}
        <div className="w-full max-w-[95%] xl:max-w-[1800px] my-8 px-4 pb-20">
          
          <div 
            ref={bookRef}
            className="bg-white w-full min-h-[85vh] shadow-2xl rounded-2xl overflow-hidden relative flex flex-col xl:flex-row transition-colors duration-500 border border-gray-200"
            style={{ backgroundColor: project.secondaryColor }}
          >
            {/* Left Column: Content (55% width on large screens) */}
            <div className="flex-1 p-10 xl:p-16 flex flex-col relative z-10 border-b xl:border-b-0 xl:border-r border-gray-200/50">
              
              {/* Header Input */}
              <div className="mb-6">
                 <div className="flex items-center gap-4 mb-2">
                   <span className="bg-sapu-100 text-sapu-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">Passo {activePage.pageNumber}</span>
                 </div>
                 <input 
                  value={activePage.title}
                  onChange={(e) => handleUpdatePage('title', e.target.value)}
                  className="w-full text-4xl xl:text-5xl font-extrabold bg-transparent border-none focus:ring-0 font-sans outline-none placeholder-gray-300 leading-tight"
                  style={{ color: project.primaryColor }}
                  placeholder="TÍTULO DO PASSO"
                />
              </div>

              {/* Main Content Textarea - Auto Growing */}
              <div className="flex-1 mb-8">
                <textarea
                  ref={textareaRef}
                  value={activePage.content}
                  onChange={(e) => handleUpdatePage('content', e.target.value)}
                  className="w-full bg-transparent resize-none outline-none text-xl xl:text-2xl leading-relaxed text-gray-800 p-4 -ml-4 rounded-xl focus:bg-white/50 focus:shadow-sm transition border border-transparent focus:border-sapu-200 overflow-hidden font-medium"
                  placeholder="Escreva a explicação técnica detalhada aqui..."
                  style={{ minHeight: '300px' }}
                />
              </div>

              {/* Mascot / Helper Tip - Bottom of Text Column */}
              {activePage.mascotTip !== undefined && (
                <div className="mt-auto relative group">
                   <div 
                     className={`rounded-2xl p-6 shadow-sm border-2 transition-all relative ${
                       tipImportance === 'critical' ? 'bg-red-50 border-red-200' :
                       tipImportance === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                       'bg-sapu-50 border-sapu-200'
                     }`}
                   >
                      <div className="flex items-center justify-between mb-3">
                         <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-lg ${
                              tipImportance === 'critical' ? 'bg-red-100 text-red-600' :
                              tipImportance === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-sapu-100 text-sapu-600'
                           }`}>
                             {/* Dynamic Icon */}
                             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                             </svg>
                           </div>
                           <h4 className={`font-bold text-sm uppercase tracking-widest ${
                              tipImportance === 'critical' ? 'text-red-700' :
                              tipImportance === 'warning' ? 'text-yellow-700' :
                              'text-sapu-700'
                           }`}>
                               {tipImportance === 'critical' ? 'Atenção Crítica' : tipImportance === 'warning' ? 'Importante' : 'Dica SapuText'}
                           </h4>
                         </div>
                         
                         {/* Importance Toggles */}
                         <div className="flex gap-1 bg-white/50 p-1 rounded-lg">
                           <button onClick={() => setTipImportance('info')} className={`w-3 h-3 rounded-full ${tipImportance === 'info' ? 'bg-sapu-500 ring-2 ring-sapu-200' : 'bg-gray-200'}`} title="Info"></button>
                           <button onClick={() => setTipImportance('warning')} className={`w-3 h-3 rounded-full ${tipImportance === 'warning' ? 'bg-yellow-500 ring-2 ring-yellow-200' : 'bg-gray-200'}`} title="Atenção"></button>
                           <button onClick={() => setTipImportance('critical')} className={`w-3 h-3 rounded-full ${tipImportance === 'critical' ? 'bg-red-500 ring-2 ring-red-200' : 'bg-gray-200'}`} title="Crítico"></button>
                         </div>
                      </div>
                      
                      <div 
                        className={`text-lg outline-none font-bold leading-relaxed ${
                          tipImportance === 'critical' ? 'text-red-800' :
                          tipImportance === 'warning' ? 'text-yellow-800' :
                          'text-sapu-800'
                        }`} 
                        contentEditable 
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const updatedPages = [...project.pages];
                          updatedPages[activePageIndex] = { ...updatedPages[activePageIndex], mascotTip: e.currentTarget.textContent || '' };
                          onUpdateProject({ ...project, pages: updatedPages });
                        }}
                      >
                        {activePage.mascotTip}
                      </div>
                   </div>
                </div>
              )}
            </div>

            {/* Right Column: Image & Visuals (45% width on large screens) */}
            <div className="w-full xl:w-[45%] bg-gray-50/50 p-8 xl:p-12 flex flex-col gap-6 border-l border-white/50">
               
               {/* Visual Header */}
               <div className="flex justify-between items-center">
                 <h3 className="text-gray-400 font-bold uppercase tracking-widest text-sm">Visualização Técnica</h3>
                 {activePage.generatedImage && (
                   <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded">Imagem Gerada</span>
                 )}
               </div>

               {/* Image Container - Large */}
               <div className="flex-1 bg-white rounded-2xl shadow-sm border-2 border-gray-200 overflow-hidden relative group min-h-[400px] flex flex-col justify-center items-center">
                  {activePage.generatedImage ? (
                    <img src={activePage.generatedImage} alt="Illustration" className="w-full h-full object-contain bg-white" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-300 p-12 text-center">
                      <svg className="w-24 h-24 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      <p className="text-lg font-bold">Nenhuma Imagem Gerada</p>
                      <p className="text-sm">Configure o prompt abaixo e gere a visualização.</p>
                    </div>
                  )}
                  
                  {/* Quick Action Overlay */}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white/90 text-gray-700 p-2 rounded-lg shadow hover:bg-white"
                      title="Fazer Upload"
                    >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                    </button>
                    <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleUploadImage} />
                  </div>
               </div>

               {/* Prompt & Generation Controls - Prominent */}
               <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sapu-700 font-bold uppercase tracking-wider text-xs">
                       Comando da Imagem (Prompt)
                    </label>
                    <span className="text-[10px] text-gray-400">Descreva setas, cores e peças</span>
                  </div>
                  
                  <textarea 
                    className="w-full h-24 p-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 text-sm focus:ring-2 focus:ring-sapu-200 focus:border-sapu-400 outline-none transition resize-none mb-4"
                    value={activePage.imagePrompt}
                    onChange={(e) => handleUpdatePage('imagePrompt', e.target.value)}
                    placeholder="Ex: Vista explodida do motor, seta vermelha indicando a peça A encaixando na B, fundo branco..."
                  />
                  
                  <button 
                    onClick={generateImage}
                    disabled={isGeneratingImage}
                    className="w-full py-4 bg-sapu-600 text-white font-bold rounded-xl hover:bg-sapu-700 active:scale-[0.98] transition shadow-lg shadow-sapu-200 flex items-center justify-center gap-3 text-lg"
                  >
                     {isGeneratingImage ? (
                       <>
                         <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                         <span>Criando Visual...</span>
                       </>
                     ) : (
                       <>
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                         <span>{activePage.generatedImage ? 'Regerar Imagem' : 'Gerar Imagem com IA'}</span>
                       </>
                     )}
                  </button>
               </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};