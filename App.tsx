
import React, { useState, useCallback } from 'react';
import { ImageProcessor } from './imageProcessor';
import { ProcessingState } from './types';

const App: React.FC = () => {
  const [state, setState] = useState<ProcessingState>({
    originalSrc: null,
    processedSrc: null,
    isProcessing: false,
    error: null,
  });

  const onFileSelected = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setState(prev => ({ ...prev, originalSrc: null, processedSrc: null, error: null }));

    const reader = new FileReader();
    reader.onload = async (e) => {
      const src = e.target?.result as string;
      setState(prev => ({ ...prev, originalSrc: src, isProcessing: true }));
      
      try {
        const processed = await ImageProcessor.process(src);
        setState(prev => ({ ...prev, processedSrc: processed, isProcessing: false }));
      } catch (err) {
        console.error(err);
        setState(prev => ({ ...prev, error: '处理失败，请重试或更换图片。', isProcessing: false }));
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const downloadImage = useCallback(() => {
    if (!state.processedSrc) return;
    const link = document.createElement('a');
    link.href = state.processedSrc;
    link.download = 'smart_contour_extract.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [state.processedSrc]);

  const reset = useCallback(() => {
    setState({
      originalSrc: null,
      processedSrc: null,
      isProcessing: false,
      error: null,
    });
  }, []);

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-gray-900 text-gray-100">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-5xl p-6 sm:p-8 space-y-8">
        
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">轮廓抠图</h1>
          <p className="mt-2 text-lg text-gray-400">智能提取手绘草图中的黑色物体，去除背景。</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Original Image Panel */}
          <div className="flex flex-col space-y-4">
            <h2 className="text-2xl font-semibold text-center text-gray-300">原图</h2>
            <div className="aspect-square w-full bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center p-4">
              {state.originalSrc ? (
                <img src={state.originalSrc} alt="原图" className="max-w-full max-h-full object-contain rounded-md shadow-inner" />
              ) : (
                <div className="text-center text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2">上传手绘图片开始</p>
                </div>
              )}
            </div>
          </div>

          {/* Processed Image Panel */}
          <div className="flex flex-col space-y-4">
            <h2 className="text-2xl font-semibold text-center text-gray-300">抠图结果</h2>
            <div className="aspect-square w-full bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center p-4 relative overflow-hidden">
              {state.isProcessing ? (
                <div className="flex flex-col items-center text-gray-400">
                  <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-lg">智能提取中...</p>
                </div>
              ) : state.processedSrc ? (
                <img 
                  src={state.processedSrc} 
                  alt="处理后的图片" 
                  className="max-w-full max-h-full object-contain rounded-md" 
                  style={{ 
                    backgroundImage: 'conic-gradient(#334155 0 25%, #475569 0 50%, #334155 0 75%, #475569 0 100%)', 
                    backgroundSize: '20px 20px' 
                  }} 
                />
              ) : (
                <div className="text-center text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="mt-2">提取后的 PNG 将显示在此</p>
                </div>
              )}
              
              {state.error && (
                <div className="absolute inset-0 bg-red-900/80 rounded-lg flex items-center justify-center p-6 text-center">
                    <div className="text-red-200">
                      <p className="font-bold mb-2">出错了</p>
                      <p>{ state.error }</p>
                    </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 border-t border-gray-700">
            <label className={`relative inline-flex items-center px-8 py-4 font-bold text-white bg-blue-600 rounded-xl cursor-pointer hover:bg-blue-700 transition-all shadow-lg active:scale-95 ${state.isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span>上传图片</span>
                <input type="file" className="hidden" onChange={onFileSelected} accept="image/*" disabled={state.isProcessing} />
            </label>
            
            <button 
              onClick={downloadImage} 
              disabled={!state.processedSrc || state.isProcessing} 
              className="inline-flex items-center px-8 py-4 font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>保存透明 PNG</span>
            </button>

            <button 
              onClick={reset} 
              disabled={!state.originalSrc && !state.processedSrc} 
              className="inline-flex items-center px-8 py-4 font-bold text-white bg-gray-600 rounded-xl hover:bg-gray-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>清空</span>
            </button>
        </div>

        <footer className="text-center text-sm text-gray-500">
          提示：最好上传白纸黑字的清晰草图。应用会提取最大的连通区域及其内部闭合区域。
        </footer>

      </div>
    </main>
  );
};

export default App;
