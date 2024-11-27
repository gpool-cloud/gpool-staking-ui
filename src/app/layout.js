import { Montserrat } from 'next/font/google';
import './globals.css';
import '../styles.css';
import '@solana/wallet-adapter-react-ui/styles.css';
import Script from 'next/script';

export const metadata = {
  title: 'GPool Stake',
  description: 'A website to stake tokens in GPool.',
};

const montserrat = Montserrat({ 
  subsets: ['latin'],
  display: 'swap',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={montserrat.className}>
      <head>
        <Script
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
              (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

              ym(99056292, "init", {
                clickmap:true,
                trackLinks:true,
                accurateTrackBounce:true
                trackHash: true,
              });
            `
          }}
        />
        <noscript>
          <div>
            <img src={`https://mc.yandex.ru/watch/99056292`} style={{ position: 'absolute', left: '-9999px' }} alt="" />
          </div>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}