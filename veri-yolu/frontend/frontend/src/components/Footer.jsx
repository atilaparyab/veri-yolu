import { EnvelopeIcon } from "@heroicons/react/24/solid";

export default function Footer() {
  return (
    <footer className="bg-gray-100 text-gray-700 border-t border-gray-200 mt-8">
      <div className="max-w-7xl mx-auto px-4 md:px-10 flex flex-col md:flex-row justify-between items-center gap-4 py-6">
        {/* Sol: Logo */}
        <div className="font-extrabold  text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500 flex-1 text-center md:text-left">
          VeriYolu
        </div>

        {/* Orta: Copyright */}
        <div className="text-sm flex-1 text-center">
          © {new Date().getFullYear()} Tüm hakları saklıdır.
        </div>

        {/* Sağ: Sosyal Medya */}
        <div className="flex-1 flex justify-center md:justify-end gap-4">
          {/* Instagram */}
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-pink-500 transition-colors"
            aria-label="Instagram"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              className="h-6 w-6"
            >
              <path d="M7.75 2h8.5A5.75 5.75 0 0122 7.75v8.5A5.75 5.75 0 0116.25 22h-8.5A5.75 5.75 0 012 16.25v-8.5A5.75 5.75 0 017.75 2zm0 1.5A4.25 4.25 0 003.5 7.75v8.5A4.25 4.25 0 007.75 20.5h8.5a4.25 4.25 0 004.25-4.25v-8.5A4.25 4.25 0 0016.25 3.5h-8.5zM12 7a5 5 0 110 10 5 5 0 010-10zm0 1.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm4.75-.75a.75.75 0 110 1.5.75.75 0 010-1.5z" />
            </svg>
          </a>

          {/* X (Twitter) */}
          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-black transition-colors"
            aria-label="X"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              className="h-6 w-6"
            >
              <path d="M4 4h4l4 5 4-5h4l-6.5 7.5L20 20h-4l-4-5-4 5H4l6.5-7.5L4 4z" />
            </svg>
          </a>

          {/* Facebook */}
          <a
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 transition-colors"
            aria-label="Facebook"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              className="h-6 w-6"
            >
              <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.987H7.897v-2.892h2.54V9.845c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.242 0-1.63.771-1.63 1.562v1.875h2.773l-.443 2.892h-2.33v6.987C18.343 21.128 22 16.991 22 12z" />
            </svg>
          </a>

          {/* YouTube */}
          <a
            href="https://youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-red-600 transition-colors"
            aria-label="YouTube"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              className="h-6 w-6"
            >
              <path d="M23.498 6.186a2.996 2.996 0 00-2.111-2.11C19.59 3.5 12 3.5 12 3.5s-7.59 0-9.387.576a2.996 2.996 0 00-2.11 2.11C0 7.983 0 12 0 12s0 4.017.503 5.814a2.996 2.996 0 002.11 2.11C4.41 20.5 12 20.5 12 20.5s7.59 0 9.387-.576a2.996 2.996 0 002.111-2.11C24 16.017 24 12 24 12s0-4.017-.502-5.814zM9.75 15.5V8.5l6.5 3.5-6.5 3.5z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
