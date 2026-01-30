import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { useTranslation } from "react-i18next";
import "./i18n";

import PublicLayout from "./components/PublicLayout";
import PrivateLayout from "./components/PrivateLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Topics from "./pages/Topics";
import TopicDetail from "./pages/TopicDetail";
import AdminPanel from "./pages/AdminPanel";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Home from "./pages/Home";
import Annotate from "./pages/Annotate";
import ProfileEdit from "./pages/ProfileEdit";
import MyImages from "./pages/MyImages";
import MyTopics from "./pages/MyTopics";
import CreateTopic from "./pages/CreateTopic";
import ProtectedRoute from "./components/ProtectedRoute";
import AboutPage from "./pages/AboutPage";
import Search from "./pages/Search";
import Discussions from "./pages/Discussions";
import Communication from "./pages/Communication";
import TopicsNav from "./pages/TopicsNav";
import ForumDetail from "./pages/ForumDetail";
import ThreadDetail from "./pages/ThreadDetail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DisNav from "./pages/DisNav";
const AppRoutes = ({ showToast }) => {
  const { user } = React.useContext(AuthContext);

  return (
    <Routes>
      {/* Public routes */}
      {!user && (
        <>
          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="/login" element={<Login showToast={showToast} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/register"
              element={<Register showToast={showToast} />}
            />
            <Route path="*" element={<NotFound />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/DisNav" element={<DisNav />} />
            <Route path="/topics" element={<Topics showToast={showToast} />} />
            <Route
              path="/topics/:id"
              element={<TopicDetail showToast={showToast} />}
            />
            <Route path="/search" element={<Search />} />
            <Route path="/discussions" element={<Discussions />} />
            <Route
              path="/discussions/forums/:forumId"
              element={<ForumDetail />}
            />
            <Route
              path="/discussions/thread/:threadId"
              element={<ThreadDetail />}
            />
            <Route path="/Communication" element={<Communication />} />
            <Route path="/TopicsNav" element={<TopicsNav />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:id" element={<Profile />} />
          </Route>
        </>
      )}
      {/* Private routes */}
      {user && (
        <Route
          element={
            <ProtectedRoute>
              <PrivateLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/profile/edit" element={<ProfileEdit />} />

          <Route
            path="/admin"
            element={
              user?.role === "admin" ? <AdminPanel /> : <Navigate to="/" />
            }
          />
          <Route
            path="/annotate"
            element={<Annotate showToast={showToast} />}
          />
          <Route
            path="/annotate/:imageId"
            element={<Annotate showToast={showToast} />}
          />
          <Route path="/my-images" element={<MyImages />} />
          <Route path="/my-topics" element={<MyTopics />} />
          <Route path="/Communication" element={<Communication />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/create-topic" element={<CreateTopic />} />
          <Route path="/topics" element={<Topics showToast={showToast} />} />
          <Route
            path="/topics/:id"
            element={<TopicDetail showToast={showToast} />}
          />
          <Route path="/search" element={<Search />} />
          <Route path="/discussions" element={<Discussions />} />
          <Route
            path="/discussions/forums/:forumId"
            element={<ForumDetail />}
          />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/discussions/thread/:threadId"
            element={<ThreadDetail />}
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      )}
    </Routes>
  );
};

function App() {
  const { i18n } = useTranslation();
  const [toast, setToast] = React.useState({ show: false, message: "" });

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  return (
    <AuthProvider>
      <Router>
        <AppRoutes showToast={showToast} />
        <button
          className="fixed bottom-4 right-1 bg-transparant text-gray-500 px-1 py-1 rounded-full border border-gray-300 "
          onClick={() =>
            i18n.changeLanguage(i18n.language === "tr" ? "en" : "tr")
          }
        >
          {i18n.language === "tr" ? "EN" : "TR"}
        </button>
      </Router>
    </AuthProvider>
  );
}

export default App;
