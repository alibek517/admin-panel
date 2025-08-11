import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import './styles/WorkStatus.css';

function WorkStatus() {
  const [isDay, setIsDay] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInitialStatus = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('http://192.168.1.52:4357/auth-check/1', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          mode: 'cors',
        });
        if (response.ok) {
          const data = await response.json();
          console.log('Initial status response:', data);
          setIsDay(data.status ?? isDay); 
        } else {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error('Error fetching initial status:', error);
        setError(`Бошланғич холатни олишда хатолик: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialStatus();
  }, []);

  const handleStartWork = async () => {
    console.log('Start Work button clicked, isLoading:', isLoading, 'isDay:', isDay); 
    if (isLoading || isDay) return; 
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://192.168.1.52:4357/auth-check/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: true }),
        mode: 'cors',
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Start work response:', data); 
        setIsDay(data.status ?? true);
      } else {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error starting work:', error);
      setError(`Ишни бошлашда хатолик: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndWork = async () => {
    console.log('End Work button clicked, isLoading:', isLoading, 'isDay:', isDay); 
    if (isLoading || !isDay) return; 
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://192.168.1.52:4357/auth-check/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: false }),
        mode: 'cors',
      });
      if (response.ok) {
        const data = await response.json();
        console.log('End work response:', data);
        setIsDay(data.status ?? false);
      } else {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error ending work:', error);
      setError(`Ишни якунлашда хатолик: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`work-status-container ${isDay ? 'day-theme' : 'night-theme'}`}>
      <div className="content-container">
        {error && <p className="error-message">{error}</p>}
        <h1 className="status-title">
          {isDay ? 'Иш бошланди' : 'Иш якунланди'}
          <span className="status-indicator">
            {isDay ? (
              <Sun size={24} color="#f39c12" />
            ) : (
              <Moon size={24} color="#bdc3c7" />
            )}
          </span>
        </h1>
        <div className="button-group">
          <button
            onClick={handleStartWork}
            disabled={isLoading || isDay}
            className={`action-button start-button ${isLoading || isDay ? 'disabled' : ''}`}
          >
            {isLoading ? 'Юкланмоқда...' : 'Ишни бошлаш'}
          </button>
          <button
            onClick={handleEndWork}
            disabled={isLoading || !isDay}
            className={`action-button end-button ${isLoading || !isDay ? 'disabled' : ''}`}
          >
            {isLoading ? 'Юкланмоқда...' : 'Ишни якунлаш'}
          </button>
        </div>
      </div>

      <div className={`background-elements ${isDay ? 'day-elements' : 'night-elements'}`}>
        {isDay && (
          <>
            <div className="sun"></div>
            <div className="cloud cloud-1"></div>
            <div className="cloud cloud-2"></div>
            <div className="cloud cloud-3"></div>
          </>
        )}
        {!isDay && (
          <>
            <div className="moon"></div>
            <div className="star star-1"></div>
            <div className="star star-2"></div>
            <div className="star star-3"></div>
            <div className="star star-4"></div>
            <div className="star star-5"></div>
            <div className="star star-6"></div>
            <div className="star star-7"></div>
            <div className="star star-8"></div>
            <div className="star star-9"></div>
            <div className="star star-10"></div>
            <div className="star star-11"></div>
            <div className="star star-12"></div>
            <div className="star star-13"></div>
            <div className="star star-14"></div>
            <div className="star star-15"></div>
            <div className="star star-16"></div>
            <div className="star star-17"></div>
            <div className="star star-18"></div>
            <div className="star star-19"></div>
            <div className="star star-20"></div>
            <div className="star star-21"></div>
            <div className="star star-22"></div>
            <div className="star star-23"></div>
            <div className="star star-24"></div>
            <div className="star star-25"></div>
            <div className="star star-26"></div>
            <div className="star star-27"></div>
            <div className="star star-28"></div>
            <div className="star star-29"></div>
            <div className="star star-30"></div>
          </>
        )}
      </div>
    </div>
  );
}

export default WorkStatus;