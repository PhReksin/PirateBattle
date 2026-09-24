import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from './app/App';
import { queryClient } from './app/queryClient';
import { SubmissionProvider } from './app/SubmissionProvider';
import { dataService } from './app/dataService';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><QueryClientProvider client={queryClient}><SubmissionProvider><App /></SubmissionProvider></QueryClientProvider></StrictMode>,
);
void dataService.start().catch(() => { /* The shell displays the store's retryable error. */ });