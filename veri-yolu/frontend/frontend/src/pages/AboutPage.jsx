import React, { useContext } from "react";
import stickmanImg from "../assets/Animasyon1.png";
import { AuthContext } from "../context/AuthContext";

const AboutPage = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* Giriş yapılmışsa footer'ı gizle */}
      {user && <style>{`footer { display: none; }`}</style>}

      {/* Üst kısım */}
      <div className="flex flex-col md:flex-row justify-between items-start">
        {/* Sol Taraf (Metinler) */}
        <div className="max-w-3xl">
          <h1 className="text-3xl font-extrabold mb-2 text-black mt-15 ">
            Hakkımızda
          </h1>
          <p className="text-gray-600  leading-relaxed">
            VeriYolu, veri bilimi meraklılarının bir araya gelip görselleri
            etiketlediği, konular hakkında tartıştığı ve veri kümelerini
            paylaştığı bir platformdur. Amacımız kullanıcılarımızın katkılarıyla
            büyüyen açık bir bilgi havuzu oluşturmaktır.
          </p>
        </div>

        {/* Sağ Taraf (Görsel) */}
        <div className="hidden md:block ml-8">
          <img
            src={stickmanImg}
            alt="Hakkımızda"
            className="w-80 object-contain"
          />
        </div>
      </div>

      {/* Alt kısım: Modüller */}

      {/* Veri Paylaşım Modülü */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">
          Veri Paylaşım Modülü
        </h2>
        <p className="text-gray-600 mb-6">
          VeriYolu kullanıcıları, etiketledikleri veri kümelerini kolayca
          paylaşabilir, yeni veri setleri oluşturabilir ve topluluğa katkıda
          bulunabilirler.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-300 rounded-lg p-4 shadow hover:shadow-lg transition">
            <h3 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">
              Veri Seti Yükleme
            </h3>
            <p className="text-gray-500 mt-2">
              Kendi veri setlerinizi platforma yükleyin ve toplulukla paylaşın.
            </p>
          </div>
          <div className="border border-gray-300 rounded-lg p-4 shadow hover:shadow-lg transition">
            <h3 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">
              Etiketleme Mekanizması
            </h3>
            <p className="text-gray-500 mt-2">
              Topluluğun katkılarıyla verileri düzenli şekilde etiketleyin.
            </p>
          </div>
          <div className="border border-gray-300 rounded-lg p-4 shadow hover:shadow-lg transition">
            <h3 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">
              Paylaşım İstatistikleri
            </h3>
            <p className="text-gray-500 mt-2">
              Hangi veri setlerinin en çok indirildiğini görün.
            </p>
          </div>
        </div>
      </div>

      {/* Stratejik Plan Modülü */}
      <div className="mt-5">
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">
          Stratejik Plan Modülü
        </h2>
        <p className="text-gray-600 mb-6">
          Topluluğun büyümesi için hedeflerimizi ve stratejilerimizi takip
          ediyoruz.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-300 rounded-lg p-4 shadow hover:shadow-lg transition">
            <h3 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">
              Hedef İzleme
            </h3>
            <p className="text-gray-500 mt-2">
              Topluluğun katılım hedeflerini grafiklerle takip edin.
            </p>
          </div>
          <div className="border border-gray-300 rounded-lg p-4 shadow hover:shadow-lg transition">
            <h3 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">
              İstatistikler
            </h3>
            <p className="text-gray-500 mt-2">
              Kullanıcı etkileşimlerini analiz ederek yeni hedefler belirleyin.
            </p>
          </div>
          <div className="border border-gray-300 rounded-lg p-4 shadow hover:shadow-lg transition">
            <h3 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">
              Topluluk Katkıları
            </h3>
            <p className="text-gray-500 mt-2">
              Kullanıcıların katkı oranlarını ölçün.
            </p>
          </div>
        </div>
      </div>

      {/* Etkinlik Modülü */}
      <div className="mt-5">
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">
          Etkinlik Modülü
        </h2>
        <p className="text-gray-600 mb-6">
          Topluluk içi etkinlikler, yarışmalar ve webinarlarla öğrenme
          deneyimini artırıyoruz.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-300 rounded-lg p-4 shadow hover:shadow-lg transition">
            <h3 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">
              Etkinlik Paylaşımları
            </h3>
            <p className="text-gray-500 mt-2">
              Yaklaşan topluluk etkinliklerini takip edin.
            </p>
          </div>
          <div className="border border-gray-300 rounded-lg p-4 shadow hover:shadow-lg transition">
            <h3 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">
              Sponsor Başvuruları
            </h3>
            <p className="text-gray-500 mt-2">
              Etkinlikler için sponsor olun veya sponsor bulun.
            </p>
          </div>
          <div className="border border-gray-300 rounded-lg p-4 shadow hover:shadow-lg transition">
            <h3 className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500">
              Eğitim & Webinar
            </h3>
            <p className="text-gray-500 mt-2">
              Veri bilimi eğitimlerini kaçırmayın.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
