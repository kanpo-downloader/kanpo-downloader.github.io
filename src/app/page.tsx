'use client';

import { useState, useEffect } from 'react';

interface FileData {
  path: string;
  size: number;
  url: string;
  downloadUrl: string;
  date: string;
  displayName: string;
}

interface GroupedFiles {
  [date: string]: {
    [type: string]: FileData[];
  };
}

interface MonthGroup {
  month: number;
  dates: [string, { [type: string]: FileData[] }][];
}

export default function Home() {
  const [selectedYear, setSelectedYear] = useState(2025);
  const [files, setFiles] = useState<GroupedFiles>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2024 + 1 }, (_, i) => currentYear - i).filter(year => year >= 2025);

  const groupFilesByMonth = (files: GroupedFiles): MonthGroup[] => {
    const monthGroups: { [month: number]: [string, { [type: string]: FileData[] }][] } = {};
    
    Object.entries(files)
      .sort(([a], [b]) => b.localeCompare(a)) // 日付の降順でソート
      .forEach(([date, typeGroups]) => {
        const month = parseInt(date.substring(4, 6));
        if (!monthGroups[month]) {
          monthGroups[month] = [];
        }
        monthGroups[month].push([date, typeGroups]);
      });
    
    return Object.keys(monthGroups)
      .map(month => parseInt(month))
      .sort((a, b) => b - a) // 月の降順でソート
      .map(month => ({
        month,
        dates: monthGroups[month]
      }));
  };

  const fetchFiles = async (year: number) => {
    setLoading(true);
    setError(null);
    try {
      const cacheUrl = `https://kanpo-ghapi-cache.m9m9.workers.dev/?year=${year}`;
      const githubUrl = `https://api.github.com/repos/kanpo-downloader/kanpo-${year}/git/trees/main?recursive=1`;

      // Try the cache endpoint first
      let response: Response | null = null;
      let data: any = null;

      try {
        response = await fetch(cacheUrl);
        if (response.ok) {
          data = await response.json();
        } else {
          // Treat non-OK as a fallback trigger
          console.warn(`Cache fetch failed with status ${response.status}, falling back to GitHub API`);
        }
      } catch (err) {
        // Network error or other problem with the cache URL
        console.warn('Cache fetch error, falling back to GitHub API', err);
        response = null;
      }

      // If cache didn't yield expected data, try GitHub Trees API as fallback
      if (!data || !data.tree) {
        const ghResp = await fetch(githubUrl, {
          headers: {
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (!ghResp.ok) {
          throw new Error(`GitHub API error! status: ${ghResp.status}`);
        }
        data = await ghResp.json();
      }
        
      // PDFファイルのみをフィルタリング
        const pdfFiles = data.tree
          .filter((item: any) => item.type === 'blob' && item.path.endsWith('.pdf'))
          .map((item: any) => ({
            path: item.path,
            size: item.size,
            url: item.url,
            downloadUrl: `https://raw.githubusercontent.com/kanpo-downloader/kanpo-${year}/refs/heads/main/${item.path}`,
            date: item.path.split('/')[0],
            displayName: parseFileName(item.path)
          }));
        
        // 日付と種別でグルーピング
        const grouped = pdfFiles.reduce((acc: GroupedFiles, file: FileData) => {
          if (!acc[file.date]) {
            acc[file.date] = {};
          }
          
          // ファイル名から種別を抽出
          const fileName = file.path.split('/')[1];
          const typeMatch = fileName.match(/^(\d{8})([hgctm])(\d{5})full(\d{4})(\d{4})\.pdf$/);
          const type = typeMatch ? typeMatch[2] : 'other';
          
          if (!acc[file.date][type]) {
            acc[file.date][type] = [];
          }
          acc[file.date][type].push(file);
          return acc;
        }, {});
        
        setFiles(grouped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ファイルの取得に失敗しました');
      setFiles({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFiles(selectedYear);
  }, [selectedYear]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1000;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日(${weekday})`;
  };

  const parseFileName = (path: string) => {
    const parts = path.split('/');
    if (parts.length < 2) {
      return path;
    }
    
    const fileName = parts[1];
    if (!fileName.endsWith('.pdf')) {
      return path;
    }
    
    // YYYYMMDD + 1文字(種別) + 5文字(号数) + full + 8文字(ページ)
    const match = fileName.match(/^(\d{8})([hgctm])(\d{5})full(\d{4})(\d{4})\.pdf$/);
    if (!match) {
      return path;
    }
    
    const [, date, type, number, startPage, endPage] = match;
    
    const typeNames: { [key: string]: string } = {
      'h': '本紙',
      'g': '号外',
      'c': '政府調達',
      't': '特別号外',
      'm': '目録'
    };
    
    const typeName = typeNames[type] || type;
    
    return typeName;
  };

  const getPageRange = (path: string) => {
    const parts = path.split('/');
    if (parts.length < 2) {
      return '';
    }
    
    const fileName = parts[1];
    if (!fileName.endsWith('.pdf')) {
      return '';
    }
    
    // YYYYMMDD + 1文字(種別) + 5文字(号数) + full + 8文字(ページ)
    const match = fileName.match(/^(\d{8})([hgctm])(\d{5})full(\d{4})(\d{4})\.pdf$/);
    if (!match) {
      return '';
    }
    
    const [, date, type, number, startPage, endPage] = match;
    const startPageNum = parseInt(startPage).toString();
    const endPageNum = parseInt(endPage).toString();
    
    return `${startPageNum}-${endPageNum}頁`;
  };

  const getIssueNumber = (path: string) => {
    const parts = path.split('/');
    if (parts.length < 2) {
      return '';
    }
    
    const fileName = parts[1];
    if (!fileName.endsWith('.pdf')) {
      return '';
    }
    
    // YYYYMMDD + 1文字(種別) + 5文字(号数) + full + 8文字(ページ)
    const match = fileName.match(/^(\d{8})([hgctm])(\d{5})full(\d{4})(\d{4})\.pdf$/);
    if (!match) {
      return '';
    }
    
    const [, date, type, number, startPage, endPage] = match;
    const issueNumber = parseInt(number).toString();
    
    return `第${issueNumber}号`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* GitHubリポジトリへのリンク */}
        <a
          href="https://github.com/kanpo-downloader/kanpo-downloader.github.io"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-0 right-0 bg-gray-800 text-white flex items-center justify-center hover:bg-gray-700 transition-colors"
          style={{ width: '75px', height: '75px', clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}
          aria-label="GitHubリポジトリを開く"
        >
          <span className="absolute top-2 right-2">
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </span>
        </a>
      
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            官報ダウンローダー
          </h1>
          <p className="text-gray-600">
            官報アーカイブを年別にダウンロードできます
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          {/* 年選択セクション */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              年を選択してください
            </h2>
            <div className="flex flex-wrap gap-3">
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedYear === year
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {year}年
                </button>
              ))}
            </div>
                           </div>

                 {/* 月選択セクション */}
                 <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                   <div className="flex flex-wrap gap-3">
                     {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                       const monthStr = month.toString().padStart(2, '0');
                       const hasFiles = Object.keys(files).some(date => date.startsWith(`${selectedYear}${monthStr}`));
                       return (
                         <button
                           key={month}
                                                 onClick={() => {
                        const monthElement = document.getElementById(`month-${month}`);
                        if (monthElement) {
                          monthElement.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                                                 className={`px-3 py-1.5 rounded-lg font-medium transition-colors border-2 ${
                        hasFiles
                          ? 'border-blue-600 text-blue-600 bg-white hover:bg-blue-50'
                          : 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed'
                      }`}
                           disabled={!hasFiles}
                         >
                           {month}月
                         </button>
                       );
                     })}
                   </div>
                 </div>

                 {/* ファイル一覧セクション */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {selectedYear}年の官報ファイル一覧
            </h2>
            
            {loading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-500">ファイルを読み込み中...</p>
              </div>
            )}
            
            {error && (
              <div className="text-center py-8">
                <p className="text-red-500">エラー: {error}</p>
              </div>
            )}
            
            {!loading && !error && Object.keys(files).length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">この年のファイルはありません</p>
              </div>
            )}
            
            {!loading && !error && Object.keys(files).length > 0 && (
              <div className="space-y-6">
                {groupFilesByMonth(files).map((monthGroup) => (
                  <div key={monthGroup.month} className="space-y-4">
                    <div id={`month-${monthGroup.month}`} className="bg-gray-100 rounded-lg p-3">
                      <h2 className="text-lg font-semibold text-gray-800">
                        {monthGroup.month}月
                      </h2>
                    </div>
                    {monthGroup.dates.map(([date, typeGroups]) => (
                      <div key={date} id={`date-${date}`} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        {formatDate(date)}
                      </h3>
                      <div className="flex gap-3 overflow-x-auto">
                        {/* 本紙 */}
                        {typeGroups.h && typeGroups.h.length > 0 && (
                          <div className="space-y-2 w-40 shrink-0">
                            {typeGroups.h.map((file, index) => (
                              <a
                                key={index}
                                href={file.downloadUrl}
                                download
                                className="block aspect-[4/3] bg-red-50 border border-red-200 rounded-lg p-3 hover:bg-red-100 transition-colors text-center relative"
                              >
                                                                  <div className="absolute top-2 left-2 bg-red-200 text-red-800 text-xs px-2 py-1 rounded font-medium">
                                    {getIssueNumber(file.path)}
                                  </div>
                                  <div className="absolute top-2 right-2 bg-gray-200 bg-opacity-50 text-gray-700 text-xs px-2 py-1 rounded font-medium">
                                    {getPageRange(file.path)}
                                  </div>
                                                                     <div className="flex items-center justify-start h-full pt-8">
                                     <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-2">
                                       <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                       </svg>
                                     </div>
                                     <div className="flex flex-col flex-1">
                                       <div className="text-base font-bold text-gray-700 mb-1">
                                         {file.displayName}
                                       </div>
                                       <div className="text-xs text-gray-500">
                                         {formatFileSize(file.size)}
                                       </div>
                                     </div>
                                   </div>
                              </a>
                            ))}
                          </div>
                        )}
                        
                        {/* 号外 */}
                        {typeGroups.g && typeGroups.g.length > 0 && (
                          <div className="space-y-2 w-40 shrink-0">
                            {typeGroups.g.map((file, index) => (
                              <a
                                key={index}
                                href={file.downloadUrl}
                                download
                                className="block aspect-[4/3] bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition-colors text-center relative"
                              >
                                                                  <div className="absolute top-2 left-2 bg-blue-200 text-blue-800 text-xs px-2 py-1 rounded font-medium">
                                    {getIssueNumber(file.path)}
                                  </div>
                                  <div className="absolute top-2 right-2 bg-gray-200 bg-opacity-50 text-gray-700 text-xs px-2 py-1 rounded font-medium">
                                    {getPageRange(file.path)}
                                  </div>
                                                                     <div className="flex items-center justify-start h-full pt-8">
                                     <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                                       <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                       </svg>
                                     </div>
                                     <div className="flex flex-col flex-1">
                                       <div className="text-base font-bold text-gray-700 mb-1">
                                         {file.displayName}
                                       </div>
                                       <div className="text-xs text-gray-500">
                                         {formatFileSize(file.size)}
                                       </div>
                                     </div>
                                   </div>
                              </a>
                            ))}
                          </div>
                        )}
                        
                        {/* 政府調達 */}
                        {typeGroups.c && typeGroups.c.length > 0 && (
                          <div className="space-y-2 w-40 shrink-0">
                            {typeGroups.c.map((file, index) => (
                              <a
                                key={index}
                                href={file.downloadUrl}
                                download
                                className="block aspect-[4/3] bg-green-50 border border-green-200 rounded-lg p-3 hover:bg-green-100 transition-colors text-center relative"
                              >
                                                                  <div className="absolute top-2 left-2 bg-green-200 text-green-800 text-xs px-2 py-1 rounded font-medium">
                                    {getIssueNumber(file.path)}
                                  </div>
                                  <div className="absolute top-2 right-2 bg-gray-200 bg-opacity-50 text-gray-700 text-xs px-2 py-1 rounded font-medium">
                                    {getPageRange(file.path)}
                                  </div>
                                                                     <div className="flex items-center justify-start h-full pt-8">
                                     <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-2">
                                       <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                       </svg>
                                     </div>
                                     <div className="flex flex-col flex-1">
                                       <div className="text-base font-bold text-gray-700 mb-1">
                                         {file.displayName}
                                       </div>
                                       <div className="text-xs text-gray-500">
                                         {formatFileSize(file.size)}
                                       </div>
                                     </div>
                                   </div>
                              </a>
                            ))}
                          </div>
                        )}
                        
                        {/* 特別号外 */}
                        {typeGroups.t && typeGroups.t.length > 0 && (
                          <div className="space-y-2 w-40 shrink-0">
                            {typeGroups.t.map((file, index) => (
                              <a
                                key={index}
                                href={file.downloadUrl}
                                download
                                className="block aspect-[4/3] bg-purple-50 border border-purple-200 rounded-lg p-3 hover:bg-purple-100 transition-colors text-center relative"
                              >
                                                                  <div className="absolute top-2 left-2 bg-purple-200 text-purple-800 text-xs px-2 py-1 rounded font-medium">
                                    {getIssueNumber(file.path)}
                                  </div>
                                  <div className="absolute top-2 right-2 bg-gray-200 bg-opacity-50 text-gray-700 text-xs px-2 py-1 rounded font-medium">
                                    {getPageRange(file.path)}
                                  </div>
                                                                     <div className="flex items-center justify-start h-full pt-8">
                                     <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-2">
                                       <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                       </svg>
                                     </div>
                                     <div className="flex flex-col flex-1">
                                       <div className="text-base font-bold text-gray-700 mb-1">
                                         {file.displayName}
                                       </div>
                                       <div className="text-xs text-gray-500">
                                         {formatFileSize(file.size)}
                                       </div>
                                     </div>
                                   </div>
                              </a>
                            ))}
                          </div>
                        )}
                        
                        {/* 目録 */}
                        {typeGroups.m && typeGroups.m.length > 0 && (
                          <div className="space-y-2 w-40 shrink-0">
                            {typeGroups.m.map((file, index) => (
                              <a
                                key={index}
                                href={file.downloadUrl}
                                download
                                className="block aspect-[4/3] bg-yellow-50 border border-yellow-200 rounded-lg p-3 hover:bg-yellow-100 transition-colors text-center relative"
                              >
                                                                  <div className="absolute top-2 left-2 bg-yellow-200 text-yellow-800 text-xs px-2 py-1 rounded font-medium">
                                    {getIssueNumber(file.path)}
                                  </div>
                                  <div className="absolute top-2 right-2 bg-gray-200 bg-opacity-50 text-gray-700 text-xs px-2 py-1 rounded font-medium">
                                    {getPageRange(file.path)}
                                  </div>
                                                                     <div className="flex items-center justify-start h-full pt-8">
                                     <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-2">
                                       <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                       </svg>
                                     </div>
                                     <div className="flex flex-col flex-1">
                                       <div className="text-base font-bold text-gray-700 mb-1">
                                         {file.displayName}
                                       </div>
                                       <div className="text-xs text-gray-500">
                                         {formatFileSize(file.size)}
                                       </div>
                                     </div>
                                   </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            )}
          </div>
        </div>

        <footer className="text-center mt-12 text-gray-500">
          <p>&copy; 2025 官報ダウンローダー. All rights reserved.</p>
        </footer>

        {/* 一番上にスクロールする追尾ボタン */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
          aria-label="一番上にスクロール"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </div>
    </div>
  );
} 