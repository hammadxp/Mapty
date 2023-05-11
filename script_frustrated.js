'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;

    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance; // min/km
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;

    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); // km/h (not min)
    return this.speed;
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const workoutsList = document.querySelector('ul');
const formButtons = document.querySelector('.form__buttons');
const formButtonCancel = document.querySelector('.form__button--cancel');
const formButtonSave = document.querySelector('.form__button--save');

// functionality of the app, besides workout object

class App {
  #map; // the whole map
  #mapEvent; // where the user clicked on the map
  #mapZoomLevel = 11;
  #workouts = [];

  // #workoutOptionsEl;

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    this._renderWorkoutsOptions();

    // const workoutOptionsEl = document.querySelectorAll('.workout__option');
    // console.log(workoutOptionsEl);

    form.addEventListener('submit', this._newWorkout.bind(this));
    formButtonSave.addEventListener('click', this._newWorkout.bind(this));
    formButtonCancel.addEventListener('click', this._hideForm.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener(
      'click',
      this._showWorkoutOptions.bind(this)
    );
    // workoutOptionsEl.addEventListener(
    //   'click',
    //   this._workoutOptionsActions.bind(this)
    // );
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(
      this._loadMap.bind(this),
      function () {
        alert('Error while getting user coordinates!');
      }
    );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    // Render map
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Default marker
    L.marker(coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: 'default-popup',
        })
      )
      .setPopupContent('Current location')
      .openPopup();

    // Load map markers
    this.#workouts.forEach(workout => this._renderWorkoutMarker(workout));

    // Map click
    this.#map.on('click', this._showForm.bind(this));
  }

  _showForm(e) {
    form.classList.remove('hidden');
    formButtons.classList.remove('hidden');

    inputDistance.focus();

    this.#mapEvent = e;
  }

  _hideForm() {
    // Clear input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    // Hide form
    // form.style.display = 'none';
    form.classList.add('hidden');
    formButtons.classList.add('hidden');
    // setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    // helper methods
    const validateIsNumber = (...inputs) =>
      inputs.every(input => Number.isFinite(input));
    const validateIsPositive = (...inputs) => inputs.every(input => input > 0);

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout is running, create a Running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validateIsNumber(distance, duration, cadence) ||
        !validateIsPositive(distance, duration, cadence)
      )
        return alert(`Please enter a positive number value`);

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout is cycling, create a Cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validateIsNumber(distance, duration, elevation) ||
        !validateIsPositive(distance, duration)
      )
        return alert(`Please enter a positive number value`);

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add workout to workouts array

    this.#workouts.push(workout);

    // Render workout marker on map

    this._renderWorkoutMarker(workout);

    // Render workout in list

    this._renderWorkoutList(workout);

    // Hide form, clear input fields

    this._hideForm();

    // Set local storage

    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkoutList(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
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

    if (workout.type === 'running')
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

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;

    let htmlWorkoutOptions = `
      <div class="workout__options hidden">
        <div class="workout__option workout__option--go-to">
          <span class="workout__option--icon">🚩</span>
          <span class="workout__option--value">Go To</span>
        </div>
        <div class="workout__option workout__option--delete">
          <span class="workout__option--icon">🗑️</span>
          <span class="workout__option--value">Delete</span>
        </div>
        <div class="workout__option workout__option--edit">
          <span class="workout__option--icon">✏️</span>
          <span class="workout__option--value">Edit</span>
        </div>
      </div>
      `;

    formButtons.insertAdjacentHTML('afterend', htmlWorkoutOptions);
    formButtons.insertAdjacentHTML('afterend', html);
  }

  _renderWorkoutsOptions() {
    const options = `
      <li class="workouts__options hidden">
        <div class="workouts__option">
          <span class="workout__icon">🗑️</span>
          <span class="workout__value">Delete All</span>
        </div>
        <div class="workouts__option">
          <span class="workout__icon">🔤</span>
          <span class="workout__value">Sort</span>
        </div>
      </li>
      `;

    workoutsList.insertAdjacentHTML('beforeend', options);
  }

  _moveToPopup(e) {
    // console.log('Move to pop-up');
    // console.log(e.target.closest('.workout__options').previousElementSibling);

    const workoutEl =
      e.target.closest('.workout__options').previousElementSibling;

    // const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(w => w.id === workoutEl.dataset.id);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // Public interface

    // won't work because of localStorage object
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(workout => this._renderWorkoutList(workout));
  }

  _removeWorkouts() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  //

  _showWorkoutOptions(e) {
    const workout = e.target.closest('.workout');

    // if (workout) {}
    if (!workout) return;

    const workoutOptionsEl = workout.nextElementSibling;
    workoutOptionsEl.classList.toggle('hidden');

    // console.log(containerWorkouts);
    // console.log(this.#workoutOptionsEl);

    this._workoutOptionsActions(workoutOptionsEl);
  }

  _workoutOptionsActions(workoutOptionsEl) {
    // _workoutOptionsActions(e) {
    // const workoutOptionsEl = e.target.closest('.workout__options');
    // const workoutOptions =
    //   workoutOptionsEl.querySelectorAll('.workout__option');

    // this.#workoutOptionsEl.addEventListener(
    //   'click',
    //   this._workoutOptionsActions.bind(this)
    // );

    // workoutOptionsEl.addEventListener(
    //   'click',
    //   this._workoutOptionsAction.bind(this)
    // );

    // console.log(workoutOptionsEl);

    const buttonGoTo = workoutOptionsEl.querySelector(
      '.workout__option--go-to'
    );
    const buttonDelete = workoutOptionsEl.querySelector(
      '.workout__option--delete'
    );
    const buttonEdit = workoutOptionsEl.querySelector('.workout__option--edit');

    buttonGoTo.addEventListener('click', this._moveToPopup.bind(this));

    // const workoutOption = e.target.closest('.workout__option');
    // console.log(workoutOption);
    // console.log(
    //   Array.from(e.target.closest('.workout__option').classList).includes(
    //     'workout__option--go-to'
    //   )
    // );
    // if (e.target.closest('.workout__option--go-to')) this._moveToPopup();
    // });
  }

  // _workoutOptionsAction(e) {
  //   const workoutOption = Array.from(
  //     e.target.closest('.workout__option').classList
  //   );

  //   if (workoutOption.includes('workout__option--go-to')) {
  //     this._moveToPopup();
  //   }
  // }

  // console.log(workoutOptions);

  // workoutOptions[0].addEventListener('click', this._moveToPopup.bind(this));
  // workoutOptions[1].addEventListener(
  //   'click',
  //   this._removeWorkout.bind(this, workout)
  // );

  _showWorkoutsOptions(e) {
    document.querySelector('.workouts__options').classList.remove('hidden');
  }

  _editWorkout() {}

  _removeWorkout(workout) {
    const workoutIndex = this.#workouts.findIndex(
      w => w.id === workout.dataset.id
    );

    this.#workouts.splice(workoutIndex, 1);
    this._setLocalStorage();
    this._refresh();
  }

  _refresh() {
    location.reload();
  }
}

const app = new App();
