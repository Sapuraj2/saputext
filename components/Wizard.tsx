import React, { useState, ChangeEvent } from 'react';
import { Genre, ImageStyle, WizardState } from '../types';
import { GENRE_OPTIONS, STYLE_OPTIONS } from '../constants';

interface WizardProps {
  onComplete: (data: WizardState) => void;
  isLoading: boolean;
}

export const Wizard: React.FC<WizardProps> = ({ onComplete, isLoading }) => {
  const [step, setStep] = useState<number>(1);
  const [data, setData] = useState<Omit<WizardState, 'step'>>({
    topic: '',
    uploadedContext: '',
    genre: Genre.EDUCATIONAL,
    imageStyle: ImageStyle.FLAT_DESIGN,
    pageCount: 10
  });

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setData(prev => ({ ...prev, uploadedContext: text }));
      };
      reader.readAsText(file);
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = () => {
    onComplete({ ...data, step: 'generating' });
  };

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white">
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-sapu-800">Criar Manual/Livro</h2>
          <span className="text-sm font-bold text-sapu-500 bg-sapu-50 px-3 py-1 rounded-full">Passo {step} de 3</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="bg-gradient-to-r from-sapu-400 to-sapu-600 h-2 rounded-full transition-all duration-500 ease-out shadow-lg shadow-sapu-200" style={{ width: `${(step / 3) * 100}%` }}></div>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-8 animate-fadeIn">
          <div>
            <label className="block text-lg font-semibold text-gray-700 mb-3">Qual o tema ou ideia prática?</label>
            <textarea
              className="w-full p-5 rounded-xl border-2 border-gray-100 focus:border-sapu-400 focus:ring-4 focus:ring-sapu-50 outline-none transition text-lg shadow-sm"
              rows={4}
              placeholder="Ex: Como montar um motor elétrico, Guia de sobrevivência na selva, Matemática passo-a-passo..."
              value={data.topic}
              onChange={(e) => setData({ ...data, topic: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide">Documento com Texto Base (Opcional)</label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-sapu-300 rounded-xl cursor-pointer bg-sapu-50 hover:bg-sapu-100 transition group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <div className="p-3 bg-white rounded-full mb-3 shadow-sm group-hover:scale-110 transition">
                    <svg className="w-6 h-6 text-sapu-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                    </svg>
                  </div>
                  <p className="mb-2 text-sm text-sapu-700 font-medium">Carregar .txt com informações</p>
                  <p className="text-xs text-sapu-400">{data.uploadedContext ? '✅ Informações carregadas!' : 'Para garantir precisão, carregue seu texto'}</p>
                </div>
                <input type="file" className="hidden" accept=".txt" onChange={handleFileChange} />
              </label>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button 
              onClick={nextStep}
              disabled={!data.topic && !data.uploadedContext}
              className="px-8 py-3 bg-sapu-600 text-white font-bold rounded-xl hover:bg-sapu-700 disabled:opacity-50 disabled:cursor-not-allowed transition transform hover:translate-x-1 shadow-lg shadow-sapu-200"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Categoria</label>
              <div className="relative">
                <select 
                  value={data.genre}
                  onChange={(e) => setData({ ...data, genre: e.target.value as Genre })}
                  className="w-full p-4 pl-4 pr-10 rounded-xl border-2 border-gray-100 bg-white focus:border-sapu-400 focus:ring-4 focus:ring-sapu-50 outline-none appearance-none cursor-pointer font-medium text-gray-700"
                >
                  {GENRE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">▼</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Tipo de Visual</label>
              <div className="relative">
                <select 
                  value={data.imageStyle}
                  onChange={(e) => setData({ ...data, imageStyle: e.target.value as ImageStyle })}
                  className="w-full p-4 pl-4 pr-10 rounded-xl border-2 border-gray-100 bg-white focus:border-sapu-400 focus:ring-4 focus:ring-sapu-50 outline-none appearance-none cursor-pointer font-medium text-gray-700"
                >
                  {STYLE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">▼</div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-4">Número de Páginas (Você escolhe)</label>
            <div className="flex items-center gap-4">
              <input 
                type="number" 
                min={2} 
                max={100}
                value={data.pageCount}
                onChange={(e) => setData({ ...data, pageCount: parseInt(e.target.value) || 0 })}
                className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-sapu-400 focus:ring-4 focus:ring-sapu-50 outline-none font-bold text-xl text-center text-sapu-800"
              />
              <span className="text-gray-500 font-medium">Páginas</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">O sistema irá sugerir uma estrutura completa para este número de páginas.</p>
          </div>

          <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
            <button onClick={prevStep} className="px-6 py-2 text-gray-500 hover:text-sapu-700 font-medium">Voltar</button>
            <button onClick={nextStep} className="px-8 py-3 bg-sapu-600 text-white font-bold rounded-xl hover:bg-sapu-700 transition transform hover:translate-x-1 shadow-lg shadow-sapu-200">Continuar</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="text-center py-6 animate-fadeIn">
          <div className="mb-8">
            <div className="w-20 h-20 bg-sapu-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📚</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-800">Pronto para estruturar!</h3>
            <p className="text-gray-500 mt-2">O SapuText vai criar o guia passo-a-passo. As imagens você gera ou carrega depois.</p>
          </div>

          <div className="bg-sapu-50 p-6 rounded-2xl text-left max-w-md mx-auto mb-10 border border-sapu-100 shadow-inner">
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <p className="text-xs text-sapu-400 uppercase font-bold">Ideia</p>
                 <p className="font-medium text-sapu-900 truncate">{data.topic || "Arquivo"}</p>
               </div>
               <div>
                 <p className="text-xs text-sapu-400 uppercase font-bold">Páginas</p>
                 <p className="font-medium text-sapu-900">{data.pageCount}</p>
               </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button onClick={prevStep} className="px-6 py-2 text-gray-500 hover:text-sapu-700 font-medium">Voltar</button>
            <button 
              onClick={handleSubmit} 
              disabled={isLoading}
              className="px-10 py-4 bg-gradient-to-r from-sapu-500 to-sapu-700 text-white font-bold rounded-xl shadow-xl hover:shadow-2xl hover:shadow-sapu-300 transform hover:-translate-y-1 transition flex items-center gap-3"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Escrevendo Guia...</span>
                </>
              ) : (
                <>
                  <span className="text-xl">🚀</span>
                  <span>Gerar Manual</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};