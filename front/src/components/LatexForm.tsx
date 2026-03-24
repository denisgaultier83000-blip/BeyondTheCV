import React from 'react';

interface LatexFormProps {
  initialData: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function LatexForm({ initialData, onSave, onCancel }: LatexFormProps) {
  const [formData, setFormData] = React.useState(initialData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevData: any) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div>
      <h2>Edit LaTeX Data</h2>
      <form>
        {Object.keys(formData).map((key) => (
          <div key={key} className="form-group">
            <label htmlFor={key}>{key}</label>
            <input
              type="text"
              id={key}
              name={key}
              value={formData[key]}
              onChange={handleChange}
            />
          </div>
        ))}
      </form>
      <div className="actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={handleSave}>
          Save and Generate
        </button>
      </div>
    </div>
  );
}
