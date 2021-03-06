import React from 'react';
import ComponentUsageExample from '../documentation/ComponentUsageExample';
import Icon from '../icon/icon';
import cx from 'classnames';
import DepartureTime from '../departure/DepartureTime';
import RouteNumber from '../departure/RouteNumber';
import { FormattedMessage } from 'react-intl';
import { favouriteLocation as favouriteLocationExample } from '../documentation/ExampleData';
import Link from 'react-router/lib/Link';

const FavouriteLocation = (props) => {
  if (!props.locationName) {
    return (
      <Link
        to="/lisaa-suosikki"
        className="cursor-pointer no-decoration"
      >
        <div className={cx('new-favourite-button-content', props.className)}>
          <Icon img="icon-icon_plus" className="add-new-favourite-icon" />
          <p className="add-location-text">
            <FormattedMessage id="add-location" defaultMessage="Add location" />
          </p>
        </div>
      </Link>
    );
  }

  let arrivalTime;
  let departureTime;
  let firstTransitLeg;
  const timeIsNotPast = props.currentTime < props.departureTime;
  if (props.arrivalTime && timeIsNotPast) {
    arrivalTime = (
      <DepartureTime
        departureTime={props.arrivalTime}
        realtime={false}
        currentTime={props.currentTime}
      />
    );
  } else {
    arrivalTime = <div className="favourite-location-content-placeholder">--:--</div>;
  }
  if (props.departureTime && timeIsNotPast) {
    departureTime = (
      <DepartureTime
        departureTime={props.departureTime}
        realtime={props.firstTransitLeg && props.firstTransitLeg.realTime}
        currentTime={props.currentTime}
        className="time--small"
      />
    );
  } else {
    departureTime =
      <div className="favourite-location-content-placeholder time--small">--:--</div>;
  }
  if (props.firstTransitLeg && props.firstTransitLeg.route) {
    firstTransitLeg = (
      <RouteNumber
        mode={props.firstTransitLeg.mode}
        realtime={props.firstTransitLeg.realTime}
        text={props.firstTransitLeg.route.shortName}
      />
    );
  }
  return (
    <div
      className={cx('favourite-location-content', props.className)}
      onClick={() => props.clickFavourite(props.locationName, props.lat, props.lon)}
    >
      <div className="favourite-location-header">{props.locationName}</div>
      <div className="favourite-location-arrival">
        <nobr>
          <span className="favourite-location-icon">
            <Icon img={props.favouriteLocationIconId} />
          </span>
          <span className="favourite-location-arrival-time">{arrivalTime}</span>
        </nobr>
      </div>
      <div className="favourite-location-departure">
        {departureTime}
        <nobr>
          <Icon img="icon-icon_arrow-right" className="favourite-location-arrow" />
          <Icon img="icon-icon_walk" className="favourite-location-departure-icon" />
        </nobr>
        {firstTransitLeg}
      </div>
    </div>
  );
};

FavouriteLocation.description = (
  <div>
    <p>Renders a favourite location component</p>
    <ComponentUsageExample description="first leg is with a bus">
      <FavouriteLocation
        clickFavourite={() => {}}
        locationName={favouriteLocationExample.locationName}
        favouriteLocationIconId="icon-icon_place"
        arrivalTime={favouriteLocationExample.arrivalTime}
        departureTime={favouriteLocationExample.departureTime}
        currentTime={favouriteLocationExample.currentTime}
        firstTransitLeg={favouriteLocationExample.firstTransitLeg}
      />
    </ComponentUsageExample>
  </div>
);

FavouriteLocation.propTypes = {
  addFavourite: React.PropTypes.func,
  clickFavourite: React.PropTypes.func,
  className: React.PropTypes.string,
  locationName: React.PropTypes.string,
  favouriteLocationIconId: React.PropTypes.string,
  arrivalTime: React.PropTypes.number,
  departureTime: React.PropTypes.number,
  currentTime: React.PropTypes.number,
  firstTransitLeg: React.PropTypes.object,
  lat: React.PropTypes.number,
  lon: React.PropTypes.number,
};

FavouriteLocation.displayName = 'FavouriteLocation';

export default FavouriteLocation;
