React = require 'react'
timeUtils    = require '../../../util/time-utils'
TransitLeg   = require './transit-leg'
intl = require 'react-intl'
FormattedMessage = intl.FormattedMessage

class FerryLeg extends React.Component

  render: ->

    <TransitLeg
      mode={"FERRY"}
      leg={@props.leg}
      focusAction={@props.focusAction}
      index={@props.index}
      >
      <FormattedMessage
        id={"ferry-with-route-number"}
        values={{
          routeNumber: @props.leg.route?.shortName
          headSign: @props.leg.trip?.tripHeadsign
          }}
        defaultMessage={"Ferry {routeNumber} {headSign}"}/>
    </TransitLeg>


module.exports = FerryLeg
