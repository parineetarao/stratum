import { IBM_Plex_Mono } from 'next/font/google';

// Technical/monospace face used for the warehouse blueprint's labels only.
export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});
