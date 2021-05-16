'use strict';

const API_KEY = '581f32242da3c91ea019cd8a57216c46';
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnDelete = document.querySelector('.delete');
const btnDeleteAll = document.querySelector('.delete__all');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-5);

  constructor(distance, duration, coords, temperature, city) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
    this.temperature = temperature;
    this.city = city;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(distance, duration, coords, temperature, city, cadence) {
    super(distance, duration, coords, temperature, city);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(distance, duration, coords, temperature, city, elevationGain) {
    super(distance, duration, coords, temperature, city);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #map;
  #maxZoom = 13;
  #mapEvent;
  #workout = [];

  constructor() {
    this._getPosition();

    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    btnDelete.addEventListener('click', this._deleteWorkout.bind(this));
    btnDeleteAll.addEventListener('click', this._deleteAllWorkout.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not find your location.');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`)`1q455re444`2  `q;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#maxZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workout.forEach(work => this._renderWorkoutMaker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  async _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    const data = await this._AJAX(
      `http://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${API_KEY}`
    );
    const temperature = data.main.temp;
    const data2 = await this._AJAX(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    const city = `${data2.locality}, ${data2.countryName}`;
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running(
        distance,
        duration,
        [lat, lng],
        temperature,
        city,
        cadence
      );
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        return alert('Inputs have to be positive numbers!');
      }

      workout = new Cycling(
        distance,
        duration,
        [lat, lng],
        temperature,
        city,
        elevation
      );
    }

    this.#workout.push(workout);

    this._renderWorkoutMaker(workout);

    this._renderWorkout(workout);

    this._hideForm();

    this._setLocalStorage('workouts', this.#workout);
  }

  _renderWorkout(workout) {
    let html = ` 
    <li class="workout workout--${workout.type}" data-id="${workout.id}"> 
          <h2>${
            Math.round(workout.temperature) > 30 ? '🌞' : '⛅'
          }  ${Math.round(workout.temperature)}&#8451</h2>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running') {
      html += `
       <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
       <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">spm</span>
          </div>
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _renderWorkoutMaker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxwidth: 200,
          minwidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${
          workout.description
        } in ${workout.city}`
      )
      .openPopup();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputElevation.value =
      inputCadence.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _moveToPopup(e) {
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workout.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#maxZoom, {
      animate: true,
      pan: {
        duration: 1,
        animate: true,
      },
    });
  }

  _setLocalStorage(name, data) {
    localStorage.setItem(name, JSON.stringify(data));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workout = data;

    this.#workout.forEach(work => this._renderWorkout(work));
  }

  async _AJAX(url) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      return data;
    } catch (err) {
      console.log(err);
    }
  }

  _deleteWorkout(e) {
    e.preventDefault();
    this.#workout.splice(0, 1);
    this._setLocalStorage('workouts', this.#workout);
    location.reload();
  }

  _deleteAllWorkout() {
    this.#workout = [];
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
