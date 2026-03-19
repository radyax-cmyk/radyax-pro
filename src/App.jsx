import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Calendar, Phone, Mail, FileText, CheckSquare, List, Plus, 
  Search, Filter, Download, BarChart3, LogIn, ChevronRight, ChevronLeft, 
  CheckCircle2, Clock, Check, FileDown, Activity, UserCheck, PackageOpen, Share2, Eye, X, Trash2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';

// --- CONFIGURACIÓN DE FIREBASE (TU CUENTA REAL) ---
const firebaseConfig = {
  apiKey: "AIzaSyB1m-dkjMIQEc0F7xUBSpEJ2I3dU0wyZTo",
  authDomain: "radyax-orden.firebaseapp.com",
  projectId: "radyax-orden",
  storageBucket: "radyax-orden.firebasestorage.app",
  messagingSenderId: "673169275402",
  appId: "1:673169275402:web:7c2033a1021ef125c33df3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Identificador único para tu base de datos
const appId = 'radyax-production';

// --- COLORES CORPORATIVOS ---
// Azul Radyax: #00609C
// Verde Radyax: #A4D65E
// Azul Claro Bg: #E5F0F6
// Verde Claro Bg: #F4F9EB

// --- CONSTANTES ---
const STUDY_CATEGORIES = {
  'Rx. Extraorales': [
    { name: 'Panorámica' },
    { name: 'Rx. Panorámica - Rx. Lateral de Cráneo' },
    { name: 'Rx. Panorámica - Rx. Lateral de Cráneo - Cefalometría' },
    { name: 'Lateral de Cráneo' },
    { name: 'P. A. de Cráneo' },
    { name: 'A.P. de Cráneo' },
    { name: 'Carpal' },
    { name: 'ATM (Boca Abierta y Cerrada)' },
    { name: 'Waters' },
    { name: 'Caldwell' },
    { name: 'Towne' }
  ],
  'Rx. Intraorales': [
    { name: 'Rx. Periapical', requiresDetail: 'odontogram', detailLabel: 'Seleccionar Órgano(s) Dentario(s):' },
    { name: 'Serie Periapical' },
    { name: 'Oclusal', requiresDetail: 'select', detailLabel: 'Seleccione Maxilar:', options: ['Superior', 'Inferior'] }
  ],
  'Tomografías': [
    { name: 'CBCT Maxilar FOV 8x5' },
    { name: 'CBCT Mandíbula FOV 8x5' },
    { name: 'CBCT Ambos Maxilares FOV 12x9' },
    { name: 'CBCT Ambos Maxilares y ATM  FOV 16x9' },
    { name: 'CBCT Endodoncia FOV 5x5', requiresDetail: 'odontogram', detailLabel: 'Seleccionar Órgano(s) Dentario(s):' },
    { name: 'CBCT ATM Dinamica (Boca Abierta y Cerrada) FOV 16x9' }
  ],
  'Paquetes': [
    { name: 'Paquete Ortodoncia', description: 'Incluye: Rx. Panorámica, Rx. Lateral de Cráneo, Fotografías, Modelos y Cefalometría', requiresDetail: 'text', detailLabel: 'Tipo de Trazado Cefalométrico:' },
    { name: 'Paquete Ortodoncia + Tomografía', description: 'Incluye: Tomografía 16x9, Rx. Panorámica, Rx. Lateral de Cráneo, Fotografías, Cefalometría, Modelos de estudio', requiresDetail: 'text', detailLabel: 'Tipo de Trazado Cefalométrico:' },
    { name: 'Paquete Implantología', description: 'Incluye: Tomografía, Escaneo Intraoral, Guía Qx' },
    { name: 'Paquete Rehabilitación', description: 'Incluye: Rx. Panorámica, Fotografías y Modelos' },
    { name: 'Paquete Periodoncia', description: 'Incluye: Rx. Panorámica, Serie Periapical y Fotografías' }
  ],
  'Otros Estudios': [
    { name: 'Cefalometría', requiresDetail: 'text', detailLabel: 'Tipo de Trazado Cefalométrico:' },
    { name: 'Escaneo Intraoral', requiresDetail: 'select', detailLabel: 'Seleccionar formato:', options: ['Archivo STL', 'Archivo STL e Impresión 3D'] },
    { name: 'Modelos', requiresDetail: 'select', detailLabel: 'Seleccionar tipo:', options: ['Modelos de Estudio', 'Modelos de Trabajo'] },
    { name: 'Fotografía', requiresDetail: 'select', detailLabel: 'Seleccionar tipo:', options: ['Extraorales', 'Intraorales', 'Ambos'] },
    { name: 'Impresión 3D', requiresDetail: 'select', detailLabel: 'Seleccionar zona:', options: ['Macizo Facial Maxilar', 'Macizo Facial Mandíbula', 'Ambos'] }
  ]
};

const ORDER_STATUS = {
  PENDING: 'Pendiente',
  DONE: 'Realizado',
  DELIVERED: 'Entregado'
};

// --- UTILIDADES DE PRECIOS ---
const getStudyPrice = (study) => {
  if (study.name === 'Rx. Panorámica - Rx. Lateral de Cráneo') return 550;
  if (study.name === 'Rx. Panorámica - Rx. Lateral de Cráneo - Cefalometría') return 650;
  if (study.category === 'Rx. Extraorales') return 280;
  
  switch (study.name) {
    case 'Rx. Periapical': return 100;
    case 'Serie Periapical': return 1100;
    case 'Oclusal': return 150;
    
    case 'CBCT Maxilar FOV 8x5':
    case 'CBCT Mandíbula FOV 8x5': return 900;
    case 'CBCT Ambos Maxilares FOV 12x9':
    case 'CBCT Ambos Maxilares y ATM  FOV 16x9': return 1300;
    case 'CBCT Endodoncia FOV 5x5': return 800;
    case 'CBCT ATM Dinamica (Boca Abierta y Cerrada) FOV 16x9': return 2000;
    
    case 'Paquete Ortodoncia': return 1150;
    case 'Paquete Ortodoncia + Tomografía': return 2060;
    case 'Paquete Implantología': return 2100;
    case 'Paquete Rehabilitación': return 800;
    case 'Paquete Periodoncia': return 1400;
    
    case 'Cefalometría': return 150;
    
    case 'Escaneo Intraoral':
      return study.detail === 'Archivo STL e Impresión 3D' ? 700 : 500;
    
    case 'Modelos':
      return study.detail === 'Modelos de Trabajo' ? 200 : 300;
      
    case 'Fotografía': return 300;
    
    case 'Impresión 3D':
      return study.detail === 'Ambos' ? 1000 : 500;
      
    default: return 0;
  }
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
};

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState('home');
  const [loading, setLoading] = useState(true);

  // Inicializar Autenticación Anónima
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Error de autenticación. Verifica que el acceso 'Anónimo' esté habilitado en Firebase:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Obtener Órdenes en tiempo real
  useEffect(() => {
    if (!user) return;
    
    const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'radyax_orders');
    const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      ordersData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setOrders(ordersData);
    }, (error) => {
      console.error("Error al obtener órdenes. Verifica tus reglas de seguridad de Firestore:", error);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <Activity className="w-8 h-8 text-[#A4D65E]" />
            <span className="font-bold text-xl tracking-tight text-[#00609C]">Radyax<span className="text-[#A4D65E]">Pro</span></span>
          </div>
          {view !== 'home' && (
            <button onClick={() => setView('home')} className="text-sm font-medium text-slate-500 hover:text-[#00609C] transition-colors">
              Inicio
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'home' && <HomeView setView={setView} />}
        {view === 'doctor_flow' && <DoctorFlow setView={setView} orders={orders} />}
        {view === 'admin_login' && <AdminLogin setView={setView} />}
        {view === 'admin_dashboard' && <AdminDashboard orders={orders} setView={setView} />}
      </main>
    </div>
  );
}

// --- VISTAS PRINCIPALES ---

function HomeView({ setView }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-2xl mx-auto animate-in fade-in zoom-in duration-500">
      <div className="bg-[#F4F9EB] p-4 rounded-full mb-6">
        <Activity className="w-16 h-16 text-[#A4D65E]" />
      </div>
      <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6">
        Gestión Digital de <br/><span className="text-[#00609C]">Órdenes Radiológicas</span>
      </h1>
      <p className="text-lg text-slate-600 mb-10">
        Plataforma moderna y rápida para doctores y administración. Genera órdenes en segundos y adminístralas en tiempo real.
      </p>
      
      <div className="grid md:grid-cols-2 gap-6 w-full">
        <button 
          onClick={() => setView('doctor_flow')}
          className="group relative flex flex-col items-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl hover:border-[#A4D65E] transition-all"
        >
          <div className="bg-[#F4F9EB] p-4 rounded-full mb-4 group-hover:bg-[#eaf5d8] transition-colors">
            <Plus className="w-8 h-8 text-[#A4D65E]" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-slate-800">Soy Doctor</h2>
          <p className="text-sm text-slate-500">Generar una nueva orden de estudio para un paciente.</p>
        </button>

        <button 
          onClick={() => setView('admin_login')}
          className="group relative flex flex-col items-center p-8 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl hover:border-[#00609C] transition-all"
        >
          <div className="bg-[#E5F0F6] p-4 rounded-full mb-4 group-hover:bg-[#d6e7f2] transition-colors">
            <LogIn className="w-8 h-8 text-[#00609C]" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-slate-800">Administración</h2>
          <p className="text-sm text-slate-500">Acceder al panel de control de Radyax.</p>
        </button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-[#E5F0F6] border-t-[#00609C] rounded-full animate-spin mb-4"></div>
      <p className="text-[#00609C] font-medium animate-pulse">Cargando Radyax Pro...</p>
    </div>
  );
}

// --- FLUJO DEL DOCTOR (WIZARD) ---

function DoctorFlow({ setView, orders }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    patientName: '',
    patientDob: '',
    patientAge: '',
    patientPhone: '',
    doctorName: '',
    doctorPhone: '',
    doctorEmail: '',
    doctorCedula: '',
    selectedStudies: [],
    observations: '',
    deliveryFormats: {
      rx: '',
      tomo: '',
      photo: ''
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedFolio, setGeneratedFolio] = useState(null);
  const [activeTab, setActiveTab] = useState('Rx. Extraorales');
  const [studySearchQuery, setStudySearchQuery] = useState('');
  
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSharingPDF, setIsSharingPDF] = useState(false);

  useEffect(() => {
    loadHtml2Pdf().catch(err => console.log("Librería PDF cargará bajo demanda."));
    
    // Cargar datos guardados del doctor al iniciar
    const savedDoctor = localStorage.getItem('radyax_doctor_data');
    if (savedDoctor) {
      try {
        const parsedDoctor = JSON.parse(savedDoctor);
        setFormData(prev => ({
          ...prev,
          doctorName: parsedDoctor.name || '',
          doctorPhone: parsedDoctor.phone || '',
          doctorEmail: parsedDoctor.email || '',
          doctorCedula: parsedDoctor.cedula || ''
        }));
      } catch (e) {
        console.error("Error leyendo datos del doctor", e);
      }
    }
  }, []);

  useEffect(() => {
    if (formData.patientDob) {
      const today = new Date();
      const birthDate = new Date(formData.patientDob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setFormData(prev => ({ ...prev, patientAge: age >= 0 ? age.toString() : prev.patientAge }));
    }
  }, [formData.patientDob]);

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateDeliveryFormat = (type, value) => {
    setFormData(prev => ({
      ...prev,
      deliveryFormats: { ...prev.deliveryFormats, [type]: value }
    }));
  };

  const toggleStudy = (studyDef, category) => {
    setFormData(prev => {
      const exists = prev.selectedStudies.find(s => s.name === studyDef.name);
      if (exists) {
        return { ...prev, selectedStudies: prev.selectedStudies.filter(s => s.name !== studyDef.name) };
      } else {
        return { ...prev, selectedStudies: [...prev.selectedStudies, { name: studyDef.name, category, detail: '' }] };
      }
    });
  };

  const updateStudyDetail = (studyName, detailValue) => {
    setFormData(prev => ({
      ...prev,
      selectedStudies: prev.selectedStudies.map(s => 
        s.name === studyName ? { ...s, detail: detailValue } : s
      )
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Guardar los datos del doctor en el dispositivo para la próxima vez
      localStorage.setItem('radyax_doctor_data', JSON.stringify({
        name: formData.doctorName,
        phone: formData.doctorPhone,
        email: formData.doctorEmail,
        cedula: formData.doctorCedula
      }));

      const countToday = orders.filter(o => o.timestamp.startsWith(new Date().toISOString().split('T')[0])).length + 1;
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const folio = `RDX-${dateStr}-${countToday.toString().padStart(3, '0')}`;
      setGeneratedFolio(folio);

      const orderData = {
        folio,
        timestamp: new Date().toISOString(),
        status: ORDER_STATUS.PENDING,
        patient: {
          name: formData.patientName,
          dob: formData.patientDob || 'No especificada',
          age: formData.patientAge || 'No especificada',
          phone: formData.patientPhone || 'No proporcionado'
        },
        doctor: {
          name: formData.doctorName,
          phone: formData.doctorPhone || 'No proporcionado',
          email: formData.doctorEmail || 'No proporcionado',
          cedula: formData.doctorCedula || 'No proporcionado'
        },
        studies: formData.selectedStudies,
        observations: formData.observations || 'Ninguna',
        deliveryFormats: formData.deliveryFormats
      };

      const ordersRef = collection(db, 'artifacts', appId, 'public', 'data', 'radyax_orders');
      await addDoc(ordersRef, orderData);
      setStep(5);
    } catch (error) {
      console.error("Error al guardar orden:", error);
      alert("Hubo un error al guardar la orden. Intente de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasRx = formData.selectedStudies.some(s => ['Rx. Extraorales', 'Rx. Intraorales'].includes(s.category) || ['Paquete Ortodoncia', 'Paquete Rehabilitación', 'Paquete Periodoncia', 'Paquete Ortodoncia + Tomografía', 'Cefalometría'].includes(s.name));
  const hasTomo = formData.selectedStudies.some(s => s.category === 'Tomografías' || ['Paquete Implantología', 'Paquete Ortodoncia + Tomografía'].includes(s.name));
  const hasPhoto = formData.selectedStudies.some(s => s.name === 'Fotografía' || ['Paquete Ortodoncia', 'Paquete Rehabilitación', 'Paquete Periodoncia', 'Paquete Ortodoncia + Tomografía'].includes(s.name));
  const hasModels = formData.selectedStudies.some(s => ['Modelos', 'Impresión 3D', 'Paquete Ortodoncia', 'Paquete Rehabilitación', 'Paquete Ortodoncia + Tomografía'].includes(s.name));
  
  const isDeliveryComplete = (!hasRx || formData.deliveryFormats.rx) &&
                             (!hasTomo || formData.deliveryFormats.tomo) &&
                             (!hasPhoto || formData.deliveryFormats.photo);

  const steps = [
    { num: 1, title: 'Paciente', icon: User },
    { num: 2, title: 'Doctor', icon: UserCheck },
    { num: 3, title: 'Estudios', icon: List },
    { num: 4, title: 'Confirmar', icon: CheckSquare }
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {step < 5 && (
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>
            <div 
              className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-[#00609C] -z-10 rounded-full transition-all duration-300"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            ></div>
            
            {steps.map(s => {
              const Icon = s.icon;
              const isActive = step >= s.num;
              return (
                <div key={s.num} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${isActive ? 'bg-[#00609C] border-[#00609C] text-white' : 'bg-white border-slate-300 text-slate-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-[#00609C]' : 'text-slate-400'}`}>{s.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4">
        
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[#00609C] border-b border-slate-100 pb-4 mb-6">Datos del Paciente</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo *</label>
              <input 
                type="text" required
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00609C] focus:border-[#00609C] outline-none transition-all"
                placeholder="Ej. Juan Pérez García"
                value={formData.patientName}
                onChange={(e) => updateForm('patientName', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Nacimiento (Opcional)</label>
                <input 
                  type="date" 
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00609C] focus:border-[#00609C] outline-none transition-all"
                  value={formData.patientDob}
                  onChange={(e) => updateForm('patientDob', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Edad</label>
                <input 
                  type="text" 
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00609C] focus:border-[#00609C] outline-none transition-all"
                  placeholder="Ej. 25"
                  value={formData.patientAge}
                  onChange={(e) => updateForm('patientAge', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono (Opcional)</label>
              <input 
                type="tel" 
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00609C] focus:border-[#00609C] outline-none transition-all"
                placeholder="Ej. 55 1234 5678"
                value={formData.patientPhone}
                onChange={(e) => updateForm('patientPhone', e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-[#00609C] border-b border-slate-100 pb-4 mb-6">Datos del Doctor</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Doctor/Clínica *</label>
              <input 
                type="text" required
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00609C] focus:border-[#00609C] outline-none transition-all"
                placeholder="Ej. Dra. María López"
                value={formData.doctorName}
                onChange={(e) => updateForm('doctorName', e.target.value)}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Celular *</label>
                <input 
                  type="tel" required
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00609C] focus:border-[#00609C] outline-none transition-all"
                  value={formData.doctorPhone}
                  onChange={(e) => updateForm('doctorPhone', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cédula Profesional (Opcional)</label>
                <input 
                  type="text" 
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00609C] focus:border-[#00609C] outline-none transition-all"
                  value={formData.doctorCedula}
                  onChange={(e) => updateForm('doctorCedula', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
              <input 
                type="email" 
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00609C] focus:border-[#00609C] outline-none transition-all"
                placeholder="correo@ejemplo.com"
                value={formData.doctorEmail}
                onChange={(e) => updateForm('doctorEmail', e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#00609C] border-b border-slate-100 pb-4 mb-2 flex justify-between items-center">
              <span>Selección de Estudios</span>
              <span className="text-sm font-normal bg-[#F4F9EB] text-[#00609C] px-3 py-1 rounded-full border border-[#A4D65E]">
                {formData.selectedStudies.length} seleccionados
              </span>
            </h2>
            
            {/* BARRA DE BÚSQUEDA */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text"
                placeholder="Buscar estudio (ej. Periapical, Tomografía...)"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00609C] outline-none text-sm transition-all shadow-sm"
                value={studySearchQuery}
                onChange={(e) => setStudySearchQuery(e.target.value)}
              />
            </div>

            {!studySearchQuery && (
              <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
                {Object.keys(STUDY_CATEGORIES).map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveTab(category)}
                    className={`whitespace-nowrap px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                      activeTab === category
                        ? 'bg-[#00609C] text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-[50vh] overflow-y-auto custom-scrollbar animate-in fade-in duration-300">
              <div className="grid sm:grid-cols-2 gap-3">
                {(studySearchQuery 
                  ? Object.entries(STUDY_CATEGORIES).flatMap(([cat, studies]) => studies.map(s => ({...s, categoryTitle: cat}))).filter(s => s.name.toLowerCase().includes(studySearchQuery.toLowerCase()))
                  : STUDY_CATEGORIES[activeTab].map(s => ({...s, categoryTitle: activeTab}))
                ).map(study => {
                  const selectedItem = formData.selectedStudies.find(s => s.name === study.name);
                  const isSelected = !!selectedItem;
                  
                  // UTILIDAD DEL MINI-ODONTOGRAMA RESPONSIVO
                  const renderTooth = (toothNum) => {
                    const isToothSelected = selectedItem?.detail && selectedItem.detail.includes(toothNum.toString());
                    return (
                      <button
                        key={toothNum}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation(); // Evita que se deseleccione el estudio al tocar un diente
                          let teethArray = selectedItem?.detail ? selectedItem.detail.split(', ').filter(Boolean) : [];
                          if (isToothSelected) {
                            teethArray = teethArray.filter(t => t !== toothNum.toString()); // Quitar diente
                          } else {
                            teethArray.push(toothNum.toString()); // Agregar diente
                            teethArray.sort();
                          }
                          updateStudyDetail(study.name, teethArray.join(', '));
                        }}
                        className={`flex-1 aspect-square max-w-[28px] min-w-[14px] rounded flex items-center justify-center text-[9px] sm:text-[10px] font-bold transition-colors border ${
                          isToothSelected 
                            ? 'bg-[#00609C] text-white border-[#00609C] shadow-inner' 
                            : 'bg-white border-slate-300 text-slate-500 hover:border-[#00609C] hover:text-[#00609C]'
                        }`}
                      >
                        {toothNum}
                      </button>
                    );
                  };

                  return (
                    <div key={study.name} className={`flex flex-col p-3 rounded-lg border transition-all ${isSelected ? 'bg-[#F4F9EB] border-[#A4D65E] shadow-sm' : 'bg-white border-slate-200 hover:border-[#A4D65E]'}`}>
                      <button
                        onClick={() => toggleStudy(study, study.categoryTitle)}
                        className="flex items-start text-left w-full text-slate-700 outline-none"
                      >
                        <div className={`mt-0.5 mr-3 w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-[#A4D65E] border-[#A4D65E]' : 'border-slate-300'}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <span className={`text-sm ${isSelected ? 'text-[#00609C] font-semibold' : ''}`}>{study.name}</span>
                          {studySearchQuery && <span className="block text-[10px] text-slate-400 mt-0.5">{study.categoryTitle}</span>}
                        </div>
                      </button>
                      
                      {isSelected && study.description && (
                        <div className="mt-2 pl-7 text-xs text-[#00609C] opacity-80 italic">
                          {study.description}
                        </div>
                      )}
                      
                      {isSelected && study.requiresDetail && (
                        <div className="mt-3 pl-7 animate-in fade-in zoom-in-95 duration-200">
                          <label className="text-xs font-semibold text-[#00609C] block mb-2">{study.detailLabel}</label>
                          
                          {/* INPUT DE TEXTO TRADICIONAL */}
                          {study.requiresDetail === 'text' && (
                            <input 
                              type="text" 
                              onChange={(e) => updateStudyDetail(study.name, e.target.value)} 
                              value={selectedItem.detail || ''} 
                              className="w-full p-2 text-xs border border-[#A4D65E] rounded outline-none focus:border-[#00609C] focus:ring-1 focus:ring-[#00609C] bg-white" 
                              placeholder="Escribir aquí..." 
                            />
                          )}
                          
                          {/* MENU DESPLEGABLE */}
                          {study.requiresDetail === 'select' && (
                            <select 
                              onChange={(e) => updateStudyDetail(study.name, e.target.value)} 
                              value={selectedItem.detail || ''} 
                              className="w-full p-2 text-xs border border-[#A4D65E] rounded outline-none focus:border-[#00609C] focus:ring-1 focus:ring-[#00609C] bg-white"
                            >
                              <option value="">Seleccionar opción...</option>
                              {study.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          )}

                          {/* MINI-ODONTOGRAMA FLUIDO */}
                          {study.requiresDetail === 'odontogram' && (
                            <div className="w-full mt-2">
                              <div className="w-full flex flex-col max-w-[380px] mx-auto">
                                <div className="flex justify-center border-b-2 border-slate-200 pb-1.5">
                                  <div className="flex flex-1 justify-end gap-[2px] sm:gap-1 border-r-2 border-slate-200 pr-1 sm:pr-1.5">
                                    {[18,17,16,15,14,13,12,11].map(renderTooth)}
                                  </div>
                                  <div className="flex flex-1 justify-start gap-[2px] sm:gap-1 pl-1 sm:pl-1.5">
                                    {[21,22,23,24,25,26,27,28].map(renderTooth)}
                                  </div>
                                </div>
                                <div className="flex justify-center pt-1.5">
                                  <div className="flex flex-1 justify-end gap-[2px] sm:gap-1 border-r-2 border-slate-200 pr-1 sm:pr-1.5">
                                    {[48,47,46,45,44,43,42,41].map(renderTooth)}
                                  </div>
                                  <div className="flex flex-1 justify-start gap-[2px] sm:gap-1 pl-1 sm:pl-1.5">
                                    {[31,32,33,34,35,36,37,38].map(renderTooth)}
                                  </div>
                                </div>
                              </div>
                              {selectedItem.detail && (
                                <div className="mt-3 text-xs text-[#00609C] font-medium bg-[#E5F0F6] p-1.5 rounded inline-block w-full text-center">
                                  Selección: <span className="font-bold">{selectedItem.detail}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {studySearchQuery && Object.entries(STUDY_CATEGORIES).flatMap(([cat, studies]) => studies).filter(s => s.name.toLowerCase().includes(studySearchQuery.toLowerCase())).length === 0 && (
                  <p className="text-slate-500 text-sm col-span-2 text-center py-4">No se encontraron estudios.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6" id="order-summary-content">
            <h2 className="text-2xl font-bold text-[#00609C] border-b border-slate-100 pb-4">Resumen de la Orden</h2>
            
            <div className="grid md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-[#A4D65E] uppercase tracking-wider mb-2">Paciente</h3>
                <p className="font-semibold text-lg text-slate-900">{formData.patientName}</p>
                <p className="text-slate-600">{formData.patientAge ? `${formData.patientAge} años` : 'Edad no especificada'} {formData.patientDob && `(Nac: ${formData.patientDob})`}</p>
                {formData.patientPhone && <p className="text-slate-600">Tel: {formData.patientPhone}</p>}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#A4D65E] uppercase tracking-wider mb-2">Doctor</h3>
                <p className="font-semibold text-lg text-slate-900">{formData.doctorName}</p>
                <p className="text-slate-600">Cédula: {formData.doctorCedula || 'N/D'}</p>
                {(formData.doctorPhone || formData.doctorEmail) && (
                  <p className="text-slate-600 text-sm mt-1">
                    {formData.doctorPhone} {formData.doctorPhone && formData.doctorEmail && ' | '} {formData.doctorEmail}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#A4D65E] uppercase tracking-wider mb-2">Estudios Solicitados</h3>
              <ul className="grid sm:grid-cols-2 gap-3">
                {formData.selectedStudies.map((s, i) => (
                  <li key={i} className="flex flex-col gap-1 bg-white border border-slate-200 p-3 rounded-lg text-sm shadow-sm">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#A4D65E] flex-shrink-0" />
                        <span className="font-medium text-[#00609C]">{s.name}</span>
                      </div>
                      <span className="font-bold text-[#A4D65E]">{formatCurrency(getStudyPrice(s))}</span>
                    </div>
                    <span className="text-slate-400 text-xs pl-6">{s.category}</span>
                    {s.detail && (
                      <span className="text-[#00609C] font-medium text-xs ml-6 bg-[#F4F9EB] py-1 px-2 rounded mt-1 border border-[#A4D65E] inline-block w-fit">
                        ↳ {s.detail}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {formData.selectedStudies.length === 0 && (
                <p className="text-red-500 text-sm">Debes seleccionar al menos un estudio.</p>
              )}
              {formData.selectedStudies.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center px-2">
                  <span className="font-bold text-[#00609C] uppercase tracking-wider text-sm">Costo Total Estimado</span>
                  <span className="text-xl font-bold text-[#A4D65E]">
                    {formatCurrency(formData.selectedStudies.reduce((sum, s) => sum + getStudyPrice(s), 0))}
                  </span>
                </div>
              )}
            </div>

            {formData.selectedStudies.length > 0 && (
              <div className="bg-[#E5F0F6] p-4 rounded-xl border border-[#00609C]/20">
                <h3 className="text-sm font-bold text-[#00609C] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <PackageOpen className="w-4 h-4 text-[#00609C]" /> Formatos de Entrega
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {hasRx && (
                    <div>
                      <label className="block text-xs font-semibold text-[#00609C] mb-1">Radiografías (Extra/Intraorales) *</label>
                      <select 
                        required
                        className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-[#00609C] outline-none"
                        value={formData.deliveryFormats.rx}
                        onChange={(e) => updateDeliveryFormat('rx', e.target.value)}
                      >
                        <option value="">Seleccionar formato...</option>
                        <option value="Acetato">Acetato</option>
                        <option value="Digital">Digital</option>
                        <option value="Ambas">Ambas</option>
                      </select>
                    </div>
                  )}
                  {hasTomo && (
                    <div>
                      <label className="block text-xs font-semibold text-[#00609C] mb-1">Tomografías *</label>
                      <select 
                        required
                        className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-[#00609C] outline-none"
                        value={formData.deliveryFormats.tomo}
                        onChange={(e) => updateDeliveryFormat('tomo', e.target.value)}
                      >
                        <option value="">Seleccionar formato...</option>
                        <option value="Correo Electrónico (Digital)">Correo Electrónico (Digital)</option>
                        <option value="Memoria USB (Paciente la trae)">Memoria USB (Paciente la trae)</option>
                      </select>
                    </div>
                  )}
                  {hasPhoto && (
                    <div>
                      <label className="block text-xs font-semibold text-[#00609C] mb-1">Fotografías Clínicas *</label>
                      <select 
                        required
                        className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-[#00609C] outline-none"
                        value={formData.deliveryFormats.photo}
                        onChange={(e) => updateDeliveryFormat('photo', e.target.value)}
                      >
                        <option value="">Seleccionar formato...</option>
                        <option value="Papel Fotográfico">Papel Fotográfico</option>
                        <option value="Digital">Digital</option>
                        <option value="Ambos">Ambos</option>
                      </select>
                    </div>
                  )}
                  {hasModels && (
                    <div className="sm:col-span-2 mt-2 bg-white p-3 border border-[#A4D65E] rounded text-sm text-[#00609C] italic flex gap-2">
                      <span className="font-semibold text-[#00609C]">Modelos e Impresiones 3D:</span> 
                      Estos estudios se entregan exclusivamente en formato físico en sucursal.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-[#A4D65E] uppercase tracking-wider mb-2 mt-4">Observaciones Clínicas</label>
              <textarea 
                rows="3"
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00609C] focus:border-[#00609C] outline-none transition-all"
                placeholder="Zonas de interés, motivos del estudio, indicaciones especiales..."
                value={formData.observations}
                onChange={(e) => updateForm('observations', e.target.value)}
              ></textarea>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="text-center py-10 animate-in zoom-in duration-500">
            <div className="w-20 h-20 bg-[#F4F9EB] text-[#A4D65E] rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-[#00609C] mb-2">¡Orden Generada!</h2>
            <p className="text-slate-600 mb-6">La orden ha sido enviada automáticamente a Radyax.</p>
            
            <div className="bg-[#E5F0F6] border border-[#00609C]/20 rounded-xl p-4 max-w-sm mx-auto mb-8">
              <p className="text-sm text-[#00609C] uppercase tracking-wider font-semibold mb-1">Folio Único</p>
              <p className="text-2xl font-mono font-bold text-[#00609C]">{generatedFolio}</p>
            </div>

            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <button 
                onClick={async () => {
                  setIsGeneratingPDF(true);
                  try {
                    await downloadPDF(formData, generatedFolio);
                  } catch (err) {
                    console.error("Error en Descargar:", err);
                    alert("Error al descargar PDF. Intenta de nuevo.");
                  } finally {
                    setIsGeneratingPDF(false);
                  }
                }}
                disabled={isGeneratingPDF || isSharingPDF}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#00609C] text-white rounded-lg hover:bg-[#004e80] transition-colors font-medium disabled:opacity-70"
              >
                <FileDown className="w-5 h-5" />
                {isGeneratingPDF ? 'Procesando...' : 'Descargar PDF'}
              </button>

              <button 
                onClick={async () => {
                  setIsSharingPDF(true);
                  try {
                    await sharePDF(formData, generatedFolio);
                  } catch (err) {
                    console.error("Error en Compartir:", err);
                    alert("El navegador no soportó compartir. Intenta Descargar el archivo.");
                  } finally {
                    setIsSharingPDF(false);
                  }
                }}
                disabled={isGeneratingPDF || isSharingPDF}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#25D366] text-white rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-70"
              >
                <Share2 className="w-5 h-5" />
                {isSharingPDF ? 'Preparando...' : 'Compartir PDF'}
              </button>

              <button 
                onClick={() => {
                  setFormData({ patientName: '', patientDob: '', patientAge: '', patientPhone: '', doctorName: formData.doctorName, doctorPhone: formData.doctorPhone, doctorEmail: formData.doctorEmail, doctorCedula: formData.doctorCedula, selectedStudies: [], observations: '', deliveryFormats: { rx: '', tomo: '', photo: '' } });
                  setStep(1);
                }}
                disabled={isGeneratingPDF || isSharingPDF}
                className="flex items-center justify-center gap-2 px-6 py-3 mt-4 bg-[#F4F9EB] text-[#00609C] border border-[#A4D65E] rounded-lg hover:bg-[#e8f3db] transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Nueva Orden
              </button>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        {step < 5 && (
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-100">
            <button 
              onClick={() => step > 1 ? setStep(step - 1) : setView('home')}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-[#00609C] hover:bg-slate-100 rounded-lg transition-colors font-medium"
            >
              <ChevronLeft className="w-5 h-5" />
              {step === 1 ? 'Cancelar' : 'Atrás'}
            </button>
            
            {step < 4 ? (
              <button 
                onClick={() => {
                  if (step === 1 && !formData.patientName) {
                    alert('Por favor completa al menos el Nombre Completo del paciente.');
                    return;
                  }
                  if (step === 2 && (!formData.doctorName || !formData.doctorPhone)) {
                    alert('Por favor ingresa el nombre del doctor y su celular.');
                    return;
                  }
                  setStep(step + 1);
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#00609C] text-white rounded-lg hover:bg-[#004e80] transition-colors font-medium shadow-sm hover:shadow"
              >
                Siguiente
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <div className="flex flex-col items-end gap-1">
                {!isDeliveryComplete && formData.selectedStudies.length > 0 && (
                  <span className="text-xs text-red-500 font-medium animate-pulse">
                    ↑ Completa los Formatos de Entrega arriba
                  </span>
                )}
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting || formData.selectedStudies.length === 0 || !isDeliveryComplete}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#00609C] text-white rounded-lg hover:bg-[#004e80] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm hover:shadow"
                >
                  {isSubmitting ? 'Enviando...' : 'Generar y Enviar Orden'}
                  {!isSubmitting && <CheckSquare className="w-5 h-5" />}
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// --- UTILIDADES PDF ---

const loadHtml2Pdf = async () => {
  if (window.html2pdf) return true;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Error al cargar librería PDF"));
    document.head.appendChild(script);
  });
};

const getPdfHtmlString = (data, folio) => {
  const hasRx = data.selectedStudies.some(s => ['Rx. Extraorales', 'Rx. Intraorales'].includes(s.category) || ['Paquete Ortodoncia', 'Paquete Rehabilitación', 'Paquete Periodoncia', 'Paquete Ortodoncia + Tomografía', 'Cefalometría'].includes(s.name));
  const hasTomo = data.selectedStudies.some(s => s.category === 'Tomografías' || ['Paquete Implantología', 'Paquete Ortodoncia + Tomografía'].includes(s.name));
  const hasPhoto = data.selectedStudies.some(s => s.name === 'Fotografía' || ['Paquete Ortodoncia', 'Paquete Rehabilitación', 'Paquete Periodoncia', 'Paquete Ortodoncia + Tomografía'].includes(s.name));
  const hasModels = data.selectedStudies.some(s => ['Modelos', 'Impresión 3D', 'Paquete Ortodoncia', 'Paquete Rehabilitación', 'Paquete Ortodoncia + Tomografía'].includes(s.name));

  const totalCost = data.selectedStudies.reduce((sum, s) => sum + getStudyPrice(s), 0);

  return `
    <div style="font-family: Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; background-color: white;">
      <div style="border-bottom: 3px solid #00609C; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <img src="/logo.png" alt="Radyax Logo" style="width: 60px; height: 60px; object-fit: contain;" onerror="this.style.display='none'" />
          <div>
            <h1 style="color: #00609C; margin: 0; font-size: 28px;">Radyax<span style="color: #A4D65E;">Pro</span></h1>
            <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">Orden de Estudios Radiológicos</p>
          </div>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-weight: bold; font-size: 18px; color: #00609C;">Folio: ${folio}</p>
          <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">Fecha: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding-right: 20px;">
            <h3 style="color: #A4D65E; font-size: 12px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; font-weight: bold;">Datos del Paciente</h3>
            <p style="margin: 0 0 5px; font-weight: bold; font-size: 16px; color: #00609C;">${data.patientName}</p>
            <p style="margin: 0 0 5px; font-size: 14px; color: #475569;">Edad: ${data.patientAge || 'N/D'} ${data.patientDob ? `(Nac: ${data.patientDob})` : ''}</p>
            ${data.patientPhone ? `<p style="margin: 0 0 5px; font-size: 14px; color: #475569;">Tel: ${data.patientPhone}</p>` : ''}
          </td>
          <td style="width: 50%; vertical-align: top;">
            <h3 style="color: #A4D65E; font-size: 12px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; font-weight: bold;">Datos del Doctor</h3>
            <p style="margin: 0 0 5px; font-weight: bold; font-size: 16px; color: #00609C;">${data.doctorName}</p>
            <p style="margin: 0 0 5px; font-size: 14px; color: #475569;">Cédula: ${data.doctorCedula || 'N/D'}</p>
            ${data.doctorPhone ? `<p style="margin: 0 0 5px; font-size: 14px; color: #475569;">Celular: ${data.doctorPhone}</p>` : ''}
          </td>
        </tr>
      </table>

      <div style="margin-bottom: 20px;">
        <h3 style="color: #A4D65E; font-size: 12px; text-transform: uppercase; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; font-weight: bold;">Estudios Solicitados</h3>
        <ul style="list-style-type: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 10px;">
          ${data.selectedStudies.map(s => `
            <li style="background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 10px 15px; border-radius: 6px; font-size: 14px; width: calc(50% - 15px); box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <strong style="color: #00609C;">${s.name}</strong>
                  <strong style="color: #6d9636;">${formatCurrency(getStudyPrice(s))}</strong>
                </div>
                <span style="color: #64748b; font-size: 12px;">Categoría: ${s.category}</span>
              </div>
              ${s.detail ? `<div style="margin-top: 6px; color: #00609C; font-size: 12px; font-weight: bold; background-color: #F4F9EB; padding: 4px 8px; border-radius: 4px; border: 1px solid #A4D65E;">> ${s.detail}</div>` : ''}
            </li>
          `).join('')}
        </ul>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 2px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: #00609C; font-size: 14px; text-transform: uppercase;">Costo Total Estimado</h3>
          <h2 style="margin: 0; color: #6d9636; font-size: 20px;">${formatCurrency(totalCost)}</h2>
        </div>
      </div>

      <div style="margin-bottom: 20px; background-color: #E5F0F6; padding: 15px; border-radius: 8px; border: 1px solid #00609C;">
        <h3 style="color: #00609C; font-size: 12px; text-transform: uppercase; margin-bottom: 10px; font-weight: bold;">Formatos de Entrega Solicitados</h3>
        <p style="margin: 0; font-size: 14px; color: #004D7A; line-height: 1.6;">
          ${hasRx && data.deliveryFormats.rx ? `<strong>Radiografías:</strong> ${data.deliveryFormats.rx} <br/>` : ''}
          ${hasTomo && data.deliveryFormats.tomo ? `<strong>Tomografías:</strong> ${data.deliveryFormats.tomo} <br/>` : ''}
          ${hasPhoto && data.deliveryFormats.photo ? `<strong>Fotografías:</strong> ${data.deliveryFormats.photo} <br/>` : ''}
          ${hasModels ? `<strong>Modelos/Impresiones 3D:</strong> Entrega Física en Sucursal <br/>` : ''}
        </p>
      </div>

      <div style="margin-bottom: 40px; background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h3 style="color: #A4D65E; font-size: 12px; text-transform: uppercase; margin-bottom: 10px; font-weight: bold;">Observaciones Clínicas</h3>
        <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">${data.observations || 'Sin observaciones adicionales.'}</p>
      </div>

      <div style="margin-bottom: 40px; background-color: #fffbeb; padding: 15px; border-radius: 8px; border: 1px solid #fcd34d;">
        <h3 style="color: #d97706; font-size: 12px; text-transform: uppercase; margin-bottom: 10px; font-weight: bold;">⚠️ Indicaciones para el Paciente</h3>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #92400e; line-height: 1.6;">
          <li style="margin-bottom: 4px;"><strong>Sin metales:</strong> Acudir sin aretes, collares, pasadores ni piercings en cabeza/cuello (Radiografías y Tomografías).</li>
          <li style="margin-bottom: 4px;"><strong>Higiene bucal:</strong> Presentarse con buena higiene (Paquetes y Escaneos).</li>
          <li><strong>Acompañantes:</strong> Ingreso preferente solo al paciente (máx. 1 acompañante). Menores de edad deben ingresar con padre o tutor.</li>
        </ul>
      </div>

      <div style="margin-top: 60px; text-align: center;">
        <div style="width: 250px; border-bottom: 1px solid #00609C; margin: 0 auto 10px;"></div>
        <p style="margin: 0; font-size: 14px; color: #00609C; font-weight: bold;">Firma del Doctor</p>
      </div>

      <div style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
        <p style="margin: 0 0 5px; font-size: 16px; color: #00609C; font-weight: bold;">Radyax Radiología Dental</p>
        <p style="margin: 0 0 5px;">Dir: 25 Ote. #1420 Local C, Col. Bella Vista</p>
        <p style="margin: 0 0 10px;">Celular: 22 29 04 23 19 &nbsp;|&nbsp; Correo: radyaxrt@gmail.com</p>
        
        <div style="display: flex; justify-content: center; gap: 20px; margin-top: 15px;">
          <a href="https://wa.me/522229042319?text=Hola,%20me%20gustar%C3%ADa%20agendar%20una%20cita%20para%20mis%20estudios%20radiol%C3%B3gicos." target="_blank" style="display: inline-block; background-color: #25D366; color: white; padding: 8px 15px; border-radius: 5px; text-decoration: none; font-weight: bold;">
            Agendar cita por WhatsApp
          </a>
          <a href="https://www.google.com/maps/search/?api=1&query=25+Ote.+1420+Local+C,+Col.+Bella+Vista" target="_blank" style="display: inline-block; background-color: #4285F4; color: white; padding: 8px 15px; border-radius: 5px; text-decoration: none; font-weight: bold;">
            Abrir en Google Maps
          </a>
        </div>
      </div>
    </div>
  `;
};

const getPdfOpt = (folio) => ({
  margin:       0,
  filename:     `Orden_${folio}.pdf`,
  image:        { type: 'jpeg', quality: 0.98 },
  html2canvas:  { scale: 2, useCORS: true, logging: false },
  jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
});

const downloadPDF = async (data, folio) => {
  await loadHtml2Pdf();
  const htmlString = getPdfHtmlString(data, folio);
  const opt = getPdfOpt(folio);
  await window.html2pdf().set(opt).from(htmlString).save();
};

const sharePDF = async (data, folio) => {
  await loadHtml2Pdf();
  const htmlString = getPdfHtmlString(data, folio);
  const opt = getPdfOpt(folio);
  
  const pdfBlob = await window.html2pdf().set(opt).from(htmlString).output('blob');
  const file = new File([pdfBlob], `Orden_${folio}.pdf`, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      title: `Orden Radyax ${folio}`,
      text: `Adjunto orden de estudios radiológicos (Folio: ${folio}).`,
      files: [file]
    });
  } else {
    throw new Error("Compartir no soportado");
  }
};

// --- LOGIN ADMINISTRADOR ---
function AdminLogin({ setView }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    // Cambia el texto entre las comillas simples por tu nueva contraseña
    if (password === 'RadyaxAdmin2024!') { 
      setView('admin_dashboard');
    } else {
      setError('Contraseña incorrecta. Intente de nuevo.');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mt-10 animate-in zoom-in-95">
      <div className="text-center mb-8">
        <div className="bg-[#E5F0F6] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <LogIn className="w-8 h-8 text-[#00609C]" />
        </div>
        <h2 className="text-2xl font-bold text-[#00609C]">Panel de Radyax</h2>
        <p className="text-slate-500 text-sm mt-1">Ingresa tus credenciales de administrador</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña de Acceso</label>
          <input 
            type="password" 
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00609C] outline-none"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button 
          type="submit"
          className="w-full py-3 bg-[#00609C] text-white rounded-lg hover:bg-[#004e80] transition-colors font-medium mt-4"
        >
          Ingresar al Dashboard
        </button>
        <button 
          type="button"
          onClick={() => setView('home')}
          className="w-full py-3 text-slate-500 hover:text-[#00609C] transition-colors text-sm"
        >
          Volver al Inicio
        </button>
      </form>
    </div>
  );
}

// --- DASHBOARD ADMINISTRADOR ---
function AdminDashboard({ orders, setView }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [viewingOrder, setViewingOrder] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  const deleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'radyax_orders', orderToDelete.id);
      await deleteDoc(orderRef);
      setOrderToDelete(null); // Cerrar el modal después de borrar
    } catch (error) {
      console.error("Error al eliminar orden:", error);
    }
  };

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === ORDER_STATUS.PENDING).length;
    
    const doctorCounts = {};
    const studyCounts = {};

    orders.forEach(o => {
      const dName = o.doctor.name;
      doctorCounts[dName] = (doctorCounts[dName] || 0) + 1;
      
      o.studies.forEach(s => {
        studyCounts[s.name] = (studyCounts[s.name] || 0) + 1;
      });
    });

    const topDoctors = Object.entries(doctorCounts).sort((a,b) => b[1] - a[1]).slice(0, 3);
    const topStudies = Object.entries(studyCounts).sort((a,b) => b[1] - a[1]).slice(0, 3);

    return { total, pending, topDoctors, topStudies };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchStatus = statusFilter === 'Todos' || o.status === statusFilter;
      const searchLower = searchTerm.toLowerCase();
      const matchSearch = 
        o.folio.toLowerCase().includes(searchLower) ||
        o.patient.name.toLowerCase().includes(searchLower) ||
        o.doctor.name.toLowerCase().includes(searchLower);
      
      return matchStatus && matchSearch;
    });
  }, [orders, searchTerm, statusFilter]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, 'artifacts', appId, 'public', 'data', 'radyax_orders', orderId);
      await updateDoc(orderRef, { status: newStatus });
    } catch (error) {
      console.error("Error al actualizar estado:", error);
    }
  };

  const exportToExcel = () => {
    const headers = ['Folio', 'Fecha', 'Paciente', 'Edad', 'Doctor', 'Estudios', 'Estado'];
    const csvContent = [
      headers.join(','),
      ...filteredOrders.map(o => {
        const date = new Date(o.timestamp).toLocaleDateString();
        const studiesStr = o.studies.map(s => s.name).join('; ');
        return `"${o.folio}","${date}","${o.patient.name}","${o.patient.age}","${o.doctor.name}","${studiesStr}","${o.status}"`;
      })
    ].join('\n');

    const blob = new Blob(["\uFEFF"+csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Ordenes_Radyax_${new Date().toLocaleDateString().replace(/\//g,'-')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#00609C]">Panel de Control Radyax</h1>
          <p className="text-slate-500">Visualización de órdenes en tiempo real</p>
        </div>
        <button 
          onClick={exportToExcel}
          className="flex items-center gap-2 bg-[#A4D65E] text-[#00609C] px-4 py-2 rounded-lg hover:bg-[#93c54d] transition shadow-sm text-sm font-bold"
        >
          <Download className="w-4 h-4" />
          Exportar Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">Total Histórico</div>
          <div className="text-3xl font-bold text-[#00609C]">{stats.total}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-medium mb-1">Órdenes Pendientes</div>
          <div className="text-3xl font-bold text-amber-500">{stats.pending}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm md:col-span-2 flex flex-col justify-center">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-slate-500 text-xs font-bold uppercase mb-2">Estudios Top</div>
              {stats.topStudies.map(([name, count], i) => (
                <div key={i} className="flex justify-between text-sm mb-1">
                  <span className="truncate pr-2">{name}</span>
                  <span className="font-medium bg-[#F4F9EB] text-[#A4D65E] px-1.5 rounded">{count}</span>
                </div>
              ))}
              {stats.topStudies.length === 0 && <p className="text-sm text-slate-400">Sin datos</p>}
            </div>
            <div>
              <div className="text-slate-500 text-xs font-bold uppercase mb-2">Doctores Top</div>
              {stats.topDoctors.map(([name, count], i) => (
                <div key={i} className="flex justify-between text-sm mb-1">
                  <span className="truncate pr-2">{name}</span>
                  <span className="font-medium bg-[#E5F0F6] text-[#00609C] px-1.5 rounded">{count}</span>
                </div>
              ))}
              {stats.topDoctors.length === 0 && <p className="text-sm text-slate-400">Sin datos</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Buscar folio, paciente o doctor..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#00609C] outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-slate-400 w-5 h-5" />
            <select 
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#00609C] bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="Todos">Todos los Estados</option>
              <option value={ORDER_STATUS.PENDING}>{ORDER_STATUS.PENDING}</option>
              <option value={ORDER_STATUS.DONE}>{ORDER_STATUS.DONE}</option>
              <option value={ORDER_STATUS.DELIVERED}>{ORDER_STATUS.DELIVERED}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium">Folio & Fecha</th>
                <th className="px-6 py-4 font-medium">Paciente</th>
                <th className="px-6 py-4 font-medium">Doctor</th>
                <th className="px-6 py-4 font-medium">Estudios</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                    No se encontraron órdenes con estos filtros.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono font-medium text-[#00609C]">{order.folio}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3" />
                        {new Date(order.timestamp).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{order.patient.name}</div>
                      <div className="text-xs text-slate-500">{order.patient.age !== 'No especificada' ? `${order.patient.age} años` : 'Edad N/D'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{order.doctor.name}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {order.studies.map((s, i) => (
                          <span key={i} className="inline-block px-2 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded text-xs truncate max-w-[150px]" title={s.name}>
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        order.status === ORDER_STATUS.PENDING ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        order.status === ORDER_STATUS.DONE ? 'bg-[#E5F0F6] text-[#00609C] border-[#00609C]/30' :
                        'bg-[#F4F9EB] text-[#6d9636] border-[#A4D65E]'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setViewingOrder(order)}
                        className="p-1.5 bg-[#E5F0F6] text-[#00609C] hover:bg-[#d6e7f2] rounded transition-colors"
                        title="Ver Detalles de la Orden"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setOrderToDelete(order)}
                        className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Eliminar Orden"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <select 
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className="text-xs border border-slate-300 rounded px-2 py-1 bg-white outline-none cursor-pointer"
                      >
                        <option value={ORDER_STATUS.PENDING}>Marcar Pendiente</option>
                        <option value={ORDER_STATUS.DONE}>Marcar Realizado</option>
                        <option value={ORDER_STATUS.DELIVERED}>Marcar Entregado</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE DETALLES DE ORDEN */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 px-6 flex justify-between items-center z-10">
              <div>
                <h2 className="text-xl font-bold text-[#00609C]">Detalles de la Orden</h2>
                <p className="text-sm text-slate-500 font-mono mt-0.5">{viewingOrder.folio} • {new Date(viewingOrder.timestamp).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}</p>
              </div>
              <button onClick={() => setViewingOrder(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h3 className="text-sm font-bold text-[#A4D65E] uppercase tracking-wider mb-2">Paciente</h3>
                  <p className="font-semibold text-lg text-slate-900">{viewingOrder.patient.name}</p>
                  <p className="text-slate-600">{viewingOrder.patient.age !== 'No especificada' ? `${viewingOrder.patient.age} años` : 'Edad no especificada'} {viewingOrder.patient.dob !== 'No especificada' && `(Nac: ${viewingOrder.patient.dob})`}</p>
                  {viewingOrder.patient.phone !== 'No proporcionado' && <p className="text-slate-600">Tel: {viewingOrder.patient.phone}</p>}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#A4D65E] uppercase tracking-wider mb-2">Doctor</h3>
                  <p className="font-semibold text-lg text-slate-900">{viewingOrder.doctor.name}</p>
                  <p className="text-slate-600">Cédula: {viewingOrder.doctor.cedula}</p>
                  <p className="text-slate-600 text-sm mt-1">
                    {viewingOrder.doctor.phone} {viewingOrder.doctor.phone !== 'No proporcionado' && viewingOrder.doctor.email !== 'No proporcionado' && ' | '} {viewingOrder.doctor.email !== 'No proporcionado' ? viewingOrder.doctor.email : ''}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#A4D65E] uppercase tracking-wider mb-2">Estudios Solicitados</h3>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {viewingOrder.studies.map((s, i) => (
                    <li key={i} className="flex flex-col gap-1 bg-white border border-slate-200 p-3 rounded-lg text-sm shadow-sm">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#A4D65E] flex-shrink-0" />
                          <span className="font-medium text-[#00609C]">{s.name}</span>
                        </div>
                        <span className="font-bold text-[#A4D65E]">{formatCurrency(getStudyPrice(s))}</span>
                      </div>
                      <span className="text-slate-400 text-xs pl-6">{s.category}</span>
                      {s.detail && (
                        <span className="text-[#00609C] font-medium text-xs ml-6 bg-[#F4F9EB] py-1 px-2 rounded mt-1 border border-[#A4D65E] inline-block w-fit">
                          ↳ {s.detail}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center px-2">
                  <span className="font-bold text-[#00609C] uppercase tracking-wider text-sm">Total Estimado</span>
                  <span className="text-xl font-bold text-[#A4D65E]">
                    {formatCurrency(viewingOrder.studies.reduce((sum, s) => sum + getStudyPrice(s), 0))}
                  </span>
                </div>
              </div>

              {viewingOrder.deliveryFormats && (viewingOrder.deliveryFormats.rx || viewingOrder.deliveryFormats.tomo || viewingOrder.deliveryFormats.photo) && (
                <div className="bg-[#E5F0F6] p-4 rounded-xl border border-[#00609C]/20">
                  <h3 className="text-sm font-bold text-[#00609C] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <PackageOpen className="w-4 h-4 text-[#00609C]" /> Formatos de Entrega
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm text-slate-700">
                    {viewingOrder.deliveryFormats.rx && (
                      <div><strong className="text-[#00609C]">Radiografías:</strong> {viewingOrder.deliveryFormats.rx}</div>
                    )}
                    {viewingOrder.deliveryFormats.tomo && (
                      <div><strong className="text-[#00609C]">Tomografías:</strong> {viewingOrder.deliveryFormats.tomo}</div>
                    )}
                    {viewingOrder.deliveryFormats.photo && (
                      <div><strong className="text-[#00609C]">Fotografías:</strong> {viewingOrder.deliveryFormats.photo}</div>
                    )}
                  </div>
                </div>
              )}

              {viewingOrder.observations && viewingOrder.observations !== 'Ninguna' && (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-2">Observaciones Clínicas</h3>
                  <p className="text-amber-900 text-sm whitespace-pre-wrap">{viewingOrder.observations}</p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={async () => {
                    setIsDownloading(true);
                    try {
                      const mappedData = {
                        patientName: viewingOrder.patient.name,
                        patientDob: viewingOrder.patient.dob !== 'No especificada' ? viewingOrder.patient.dob : '',
                        patientAge: viewingOrder.patient.age !== 'No especificada' ? viewingOrder.patient.age.replace(' años', '') : '',
                        patientPhone: viewingOrder.patient.phone !== 'No proporcionado' ? viewingOrder.patient.phone : '',
                        doctorName: viewingOrder.doctor.name,
                        doctorPhone: viewingOrder.doctor.phone !== 'No proporcionado' ? viewingOrder.doctor.phone : '',
                        doctorCedula: viewingOrder.doctor.cedula !== 'No proporcionado' ? viewingOrder.doctor.cedula : '',
                        doctorEmail: viewingOrder.doctor.email !== 'No proporcionado' ? viewingOrder.doctor.email : '',
                        selectedStudies: viewingOrder.studies,
                        observations: viewingOrder.observations !== 'Ninguna' ? viewingOrder.observations : '',
                        deliveryFormats: viewingOrder.deliveryFormats || { rx: '', tomo: '', photo: '' }
                      };
                      await downloadPDF(mappedData, viewingOrder.folio);
                    } catch (err) {
                      alert("Error al descargar PDF.");
                    } finally {
                      setIsDownloading(false);
                    }
                  }}
                  disabled={isDownloading}
                  className="flex items-center gap-2 bg-[#00609C] text-white px-5 py-2.5 rounded-lg hover:bg-[#004e80] transition shadow-sm font-medium disabled:opacity-70"
                >
                  <FileDown className="w-4 h-4" />
                  {isDownloading ? 'Generando PDF...' : 'Descargar PDF Original'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-center text-slate-900 mb-2">¿Eliminar Orden?</h3>
            <p className="text-center text-slate-500 mb-6">
              Estás a punto de eliminar la orden <strong className="text-slate-700">{orderToDelete.folio}</strong> de <strong className="text-slate-700">{orderToDelete.patient.name}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setOrderToDelete(null)}
                className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={deleteOrder}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}