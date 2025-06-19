import React, { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCommissionRate } from '../store/commissionSlice';
import './styles/CommissionInput.css';

const CommissionInput = ({ orderAmount, value, onChange }) => {
  const dispatch = useDispatch();
  const commissionRate = useSelector((state) => state.commission.commissionRate);

  useEffect(() => {
    if (value !== undefined && value !== commissionRate) {
      dispatch(setCommissionRate(value));
    }
  }, [value, commissionRate, dispatch]);

  const totalAmount = orderAmount + orderAmount * (commissionRate / 100);

  const handleCommissionChange = (e) => {
    const newValue = Number(e.target.value);
    if (newValue >= -1 && newValue <= 100) {
      dispatch(setCommissionRate(newValue));
      if (onChange) {
        onChange(newValue);
      }
    }
  };

  const formatPrice = useCallback((price) => {
    return price
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
      .replace(/\.00$/, "")
      .trim() + " сўм";
  }, []);

  return (
    <div className="form-group">
      <label className="form-label">Хизмат ҳақи комиссияси (%)</label>
      <input
        style={{ width: '200px', height: '50px', fontSize: '20px' }}
        type="number"
        className="form-control"
        value={commissionRate}
        onChange={handleCommissionChange}
        min="-1"
        max="100"
        step="0.1"
        placeholder="Комиссия фоизини киритинг"
      />
      <div className="commission-info">
        <p>Намуна буюртма суммаси: {formatPrice(orderAmount.toFixed(2))}</p>
        <p>Комиссия ({commissionRate}%): {formatPrice((orderAmount * (commissionRate / 100)).toFixed(2))}</p>
        <p className="font-bold">Жами сумма: {formatPrice(totalAmount.toFixed(2))}</p>
      </div>
    </div>
  );
};

export default CommissionInput;